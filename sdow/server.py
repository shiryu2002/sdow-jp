"""
Server web framework.
"""

import time
import logging
import google.cloud.logging

from flask_cors import CORS
from flask_compress import Compress
from flask import Flask, request, jsonify

from sdow.database import Database
from sdow.helpers import InvalidRequest, fetch_wikipedia_pages_info


# Connect to the SDOW database.
database = Database(sdow_database='./sdow.sqlite', searches_database='./searches.sqlite')

# Initialize the Flask app.
app = Flask(__name__)

app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

# Add support for cross-origin requests.
CORS(app)

# Add gzip compression.
Compress(app)


# Gunicorn entry point.
def load_app(environment='dev'):
  # Initialize GCP logging (production only).
  if environment == 'prod':
    print('[INFO] Starting app in production mode with remote logging enabled...')
    logging_client = google.cloud.logging.Client()
    logging_client.setup_logging()

  return app


@app.errorhandler(500)
@app.errorhandler(Exception)
def unhandled_exception_handler(error):
  '''Unhandled exception handler.'''
  logging.exception('Internal server error: %s', {
      'error': error,
      'data': request.data
  }, stack_info=True)

  return jsonify({
      'error': '予期しない内部サーバーエラーが発生しました。もう一度お試しください。'
  }), 500


@app.errorhandler(404)
@app.errorhandler(405)
def route_not_found_handler(error):
  '''Route not found handler.'''
  logging.debug('Route not found: {0} {1}'.format(request.method, request.path))
  return jsonify({
      'error': 'ルートが見つかりません: {0} {1}'.format(request.method, request.path)
  }), 404


@app.errorhandler(InvalidRequest)
def invalid_request_handler(error):
  '''Invalid request handler.'''
  response = jsonify(error.to_dict())
  response.status_code = error.status_code
  return response


@app.route('/ok', methods=['GET'])
def ok_endpoint():
  '''Health check endpoint.'''
  return jsonify({
      'timestamp': int(round(time.time() * 1000))
  })


@app.route('/paths', methods=['POST'])
def shortest_paths_route():
  """Endpoint which returns a list of shortest paths between two Wikipedia pages.

    Args:
      source: The title of the page at which to start the search.
      target: The title of the page at which to end the search.

    Returns:
      dict: A JSON-ified dictionary containing the shortest paths (represented by a list of lists of
            page IDs) and the corresponding pages data (represented by a dictionary of page IDs).

    Raises:
      InvalidRequest: If either of the provided titles correspond to pages which do not exist.
  """
  start_time = time.time()

  # Look up the IDs for each page.
  try:
    (source_page_id, source_page_title,
     is_source_redirected) = database.fetch_page(request.json['source'])
  except ValueError:
    raise InvalidRequest(
        '開始ページ「{0}」は存在しません。別の検索をお試しください。'.format(request.json['source']))

  try:
    (target_page_id, target_page_title,
     is_target_redirected) = database.fetch_page(request.json['target'])
  except ValueError:
    raise InvalidRequest(
        '終了ページ「{0}」は存在しません。別の検索をお試しください。'.format(request.json['target']))

  # Compute the shortest paths.
  paths = database.compute_shortest_paths(source_page_id, target_page_id)

  response = {
      'sourcePageTitle': source_page_title,
      'targetPageTitle': target_page_title,
      'isSourceRedirected': is_source_redirected,
      'isTargetRedirected': is_target_redirected,
  }

  # No paths found.
  if len(paths) == 0:
    logging.info('No paths found from {0} to {1}'.format(source_page_id, target_page_id))
    response['paths'] = []
    response['pages'] = []
  # Paths found
  else:
    # Get a list of all IDs.
    page_ids_set = set()
    for path in paths:
      for page_id in path:
        page_ids_set.add(str(page_id))

    response['paths'] = paths
    response['pages'] = fetch_wikipedia_pages_info(list(page_ids_set), database)


  try:
    database.insert_result({
      'source_id': source_page_id,
      'target_id': target_page_id,
      'duration': time.time() - start_time,
      'paths': paths,
    })
  except Exception as e:
    # Log the error and continue.
    logging.error('An unexpected error occurred while inserting result: {0}'.format(e))

  return jsonify(response)


@app.route('/api', methods=['POST'])
def api_route():
  """API endpoint which returns the shortest route between two Wikipedia pages.

    Request body (JSON):
      source: The title of the start page.
      target: The title of the goal page.

    Returns:
      dict: A JSON-ified dictionary containing:
        - source: The resolved source page title
        - target: The resolved target page title
        - route: A list of page titles representing the shortest path from source to target

    Raises:
      InvalidRequest: If either of the provided titles correspond to pages which do not exist.
  """
  # Validate request body
  try:
    json_data = request.get_json(force=True)
  except Exception:
    raise InvalidRequest('リクエストボディがありません。JSON形式でsourceとtargetを指定してください。')

  if not json_data:
    raise InvalidRequest('リクエストボディがありません。JSON形式でsourceとtargetを指定してください。')

  if 'source' not in json_data:
    raise InvalidRequest('sourceパラメータが必要です。')

  if 'target' not in json_data:
    raise InvalidRequest('targetパラメータが必要です。')

  # Look up the IDs for each page.
  try:
    (source_page_id, source_page_title, _) = database.fetch_page(json_data['source'])
  except ValueError:
    raise InvalidRequest(
        '開始ページ「{0}」は存在しません。別の検索をお試しください。'.format(json_data['source']))

  try:
    (target_page_id, target_page_title, _) = database.fetch_page(json_data['target'])
  except ValueError:
    raise InvalidRequest(
        '終了ページ「{0}」は存在しません。別の検索をお試しください。'.format(json_data['target']))

  # Compute the shortest paths.
  paths = database.compute_shortest_paths(source_page_id, target_page_id)

  # Build the response
  response = {
      'source': source_page_title,
      'target': target_page_title,
  }

  if len(paths) == 0:
    response['route'] = []
  else:
    # Get the first (shortest) path and convert page IDs to titles
    first_path = paths[0]
    route = []
    for page_id in first_path:
      page_title = database.fetch_page_title(page_id)
      route.append(page_title)
    response['route'] = route

  return jsonify(response)
