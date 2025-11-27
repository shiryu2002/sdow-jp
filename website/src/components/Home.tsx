import React, {useCallback, useState} from 'react';
import ReactModal from 'react-modal';
import {useLocation, useNavigate} from 'react-router-dom';
import styled from 'styled-components';

import {fetchShortestPaths} from '../api';
import {WikipediaPage, WikipediaPageId} from '../types';
import {getRandomPageTitle} from '../utils';
import {Button} from './common/Button';
import {Logo} from './common/Logo';
import {Loading} from './Loading';
import {NavLinks} from './NavLinks';
import {PageInput} from './PageInput';
import {Results} from './Results';
import {SwapInputValuesButton} from './SwapInputValuesButton';

interface ShortestPathsState {
  readonly paths: readonly WikipediaPageId[][];
  readonly pagesById: Record<WikipediaPageId, WikipediaPage>;
  readonly sourcePageTitle: string;
  readonly targetPageTitle: string;
  readonly isSourceRedirected: boolean;
  readonly isTargetRedirected: boolean;
  readonly durationInSeconds: string;
}

ReactModal.setAppElement('#root');

const Modal = styled(ReactModal)`
  position: absolute;
  top: 60px;
  right: 20px;
  width: 300px;
  padding: 12px;
  z-index: 10;
  text-align: justify;
  border: solid 3px ${({theme}) => theme.colors.darkGreen};
  background: ${({theme}) => theme.colors.creme};

  p {
    font-size: 16px;
    font-family: 'Quicksand';
    line-height: 1.5;
    margin-bottom: 12px;
  }

  p:last-of-type {
    margin-bottom: 0;
  }

  a,
  a:visited {
    color: ${({theme}) => theme.colors.darkGreen};
    transition: color 0.5s;
  }

  a:hover {
    color: ${({theme}) => theme.colors.red};
  }

  @media (max-width: 600px) {
    width: 80%;
    top: 104px;
    left: 10%;
  }
`;

const P = styled.p`
  margin: 16px;
  font-size: 32px;
  text-align: center;
  color: ${({theme}) => theme.colors.darkGreen};

  @media (max-width: 600px) {
    margin: 12px;
    font-size: 24px;
  }
`;

const InputFlexContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;

  @media (max-width: 1200px) {
    flex-direction: column;
  }
`;

const SearchButtonWrapper = styled(Button)`
  width: 240px;
  height: 72px;
  margin: 0 auto 40px;
  font-size: 32px;
  border-radius: 8px;

  @media (max-width: 600px) {
    width: 200px;
    height: 60px;
    font-size: 28px;
  }
`;

const ErrorMessageWrapper = styled.p`
  width: 700px;
  margin: 40px auto;
  font-size: 28px;
  text-align: center;
  line-height: 1.5;
  color: ${({theme}) => theme.colors.red};
  text-shadow: black 1px 1px;

  @media (max-width: 1200px) {
    width: 70%;
    font-size: 24px;
  }
`;

const ErrorMessage: React.FC<{readonly text: string}> = ({text}) => {
  const tokens = text.split('"');

  return (
    <ErrorMessageWrapper>
      {tokens.map((token, i) =>
        // Bold page titles in the provided error message.
        i % 2 === 0 ? <span key={i}>{token}</span> : <b key={i}>"{token}"</b>
      )}
    </ErrorMessageWrapper>
  );
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showModal, setShowModal] = useState(false);

  // Initialize the source and target page titles from the URL.
  const searchParamsFromUrl = new URLSearchParams(location.search);
  const [sourcePageTitle, setSourcePageTitle] = useState(searchParamsFromUrl.get('source') || '');
  const [targetPageTitle, setTargetPageTitle] = useState(searchParamsFromUrl.get('target') || '');

  const [sourcePagePlaceholderText, setSourcePagePlaceholderText] = useState(getRandomPageTitle());
  const [targetPagePlaceholderText, setTargetPagePlaceholderText] = useState(getRandomPageTitle());

  const [shortestPathsState, setShortestPathsState] = useState<ShortestPathsState | null>(null);
  const [isFetchingResults, setIsFetchingResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleFetchShortestPaths = useCallback(async () => {
    const startTimeInMilliseconds = Date.now();

    setShortestPathsState(null);
    setIsFetchingResults(true);
    setErrorMessage(null);

    const actualSourcePageTitle = sourcePageTitle || sourcePagePlaceholderText;
    const actualTargetPageTitle = targetPageTitle || targetPagePlaceholderText;

    try {
      // Update the URL to reflect the new search.
      const searchParams = new URLSearchParams();
      searchParams.set('source', actualSourcePageTitle);
      searchParams.set('target', actualTargetPageTitle);
      navigate({search: searchParams.toString()});

      const response = await fetchShortestPaths({
        sourcePageTitle: actualSourcePageTitle,
        targetPageTitle: actualTargetPageTitle,
      });

      setShortestPathsState({
        paths: response.paths,
        pagesById: response.pagesById,
        sourcePageTitle: response.sourcePageTitle,
        targetPageTitle: response.targetPageTitle,
        isSourceRedirected: response.isSourceRedirected,
        isTargetRedirected: response.isTargetRedirected,
        durationInSeconds: ((Date.now() - startTimeInMilliseconds) / 1000).toFixed(2),
      });

      navigate({search: searchParams.toString()});
    } catch (error: unknown) {
      if ((error as Error).message === 'Network Error') {
        // This can happen when the server is down, the Flask app is not running, or when the
        // FLASK_DEBUG environment variable is set to 1 and there is a 5xx server error (see
        // https://github.com/corydolphin/flask-cors/issues/67 for details).
        setErrorMessage(
          '申し訳ありません... ウィキペディアの6次の隔たりは一時的に利用できません。数秒後にもう一度お試しください。'
        );
      } else {
        // This can happen when there is a 4xx or 5xx error (except for the case noted in the
        // comment above).
        const defaultErrorMessage =
          '申し訳ありません... 問題が発生しました。別の検索をお試しください。';

        setErrorMessage((error as Error).message || defaultErrorMessage);
      }
    }

    setIsFetchingResults(false);
  }, [
    navigate,
    sourcePagePlaceholderText,
    sourcePageTitle,
    targetPagePlaceholderText,
    targetPageTitle,
  ]);

  return (
    <div>
      <Logo
        onClick={() => {
          // Clear page inputs.
          setSourcePageTitle('');
          setTargetPageTitle('');

          // Reset shortest paths reponse data.
          setShortestPathsState(null);
          setIsFetchingResults(false);
          setErrorMessage(null);
        }}
      />

      <NavLinks handleOpenModal={handleOpenModal} />

      <Modal isOpen={showModal} onRequestClose={handleCloseModal}>
        <p>
          <a href="https://ja.wikipedia.org/wiki/%E5%85%AD%E6%AC%A1%E3%81%AE%E9%9A%94%E3%81%9F%E3%82%8A">
            六次の隔たり
          </a>
          のコンセプトに着想を得た<b>ウィキペディアの6次の隔たり</b>
          は、ウィキペディア上のハイパーリンクをたどり、世界最大のオンライン百科事典の数百万ページ間を移動するのに必要な最短クリック数を見つけます。
        </p>
        <p>
          2つのウィキペディアのページ名をこのサイトの入力欄に入力し、「検索」ボタンをクリックして、ウィキペディアがどれほど繋がっているかを発見してください。
        </p>
        <p>
          ウィキペディアはウィキメディア財団の登録商標です。このサイトはファンが作成したもので、ウィキメディア財団とは一切関係ありません。
        </p>
        <p>
          <a href="https://jwn.gr/">Jacob Wenger</a>によるプロジェクト。
        </p>
      </Modal>

      <P>最短経路を探す</P>
      <InputFlexContainer>
        <PageInput
          title={sourcePageTitle}
          setTitle={setSourcePageTitle}
          placeholderText={sourcePagePlaceholderText}
          setPlaceholderText={setSourcePagePlaceholderText}
        />
        <SwapInputValuesButton
          canSwap={targetPageTitle.trim().length > 0 && sourcePageTitle.trim().length > 0}
          onClick={() => {
            setSourcePageTitle(targetPageTitle);
            setTargetPageTitle(sourcePageTitle);
          }}
        />
        <PageInput
          title={targetPageTitle}
          setTitle={setTargetPageTitle}
          placeholderText={targetPagePlaceholderText}
          setPlaceholderText={setTargetPagePlaceholderText}
        />
      </InputFlexContainer>

      {isFetchingResults ? null : (
        <SearchButtonWrapper
          onClick={async () => {
            if (sourcePageTitle.trim().length === 0) {
              setSourcePageTitle(sourcePagePlaceholderText);
            }
            if (targetPageTitle.trim().length === 0) {
              setTargetPageTitle(targetPagePlaceholderText);
            }

            await handleFetchShortestPaths();
          }}
        >
          検索
        </SearchButtonWrapper>
      )}

      {errorMessage !== null ? (
        <ErrorMessage text={errorMessage} />
      ) : isFetchingResults ? (
        <Loading />
      ) : shortestPathsState ? (
        <Results
          paths={shortestPathsState.paths}
          pagesById={shortestPathsState.pagesById}
          sourcePageTitle={shortestPathsState.sourcePageTitle}
          targetPageTitle={shortestPathsState.targetPageTitle}
          isSourceRedirected={shortestPathsState.isSourceRedirected}
          isTargetRedirected={shortestPathsState.isTargetRedirected}
          durationInSeconds={shortestPathsState.durationInSeconds}
        />
      ) : null}
    </div>
  );
};
