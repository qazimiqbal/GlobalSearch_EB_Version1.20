import { React } from "jimu-core";

interface SearchResultsProps {
  loading: boolean;
  error: string | null;
  loadingImage: string;
  detailsContent: React.ReactNode;
}

const SearchResults = (props: SearchResultsProps) => {
  const { loading, error, loadingImage, detailsContent } = props;

  return (
    <>
      {loading && (
        <div style={{ textAlign: "center", margin: "8px 0" }}>
          <img src={loadingImage} alt="Loading" />
        </div>
      )}
      {error && <p>{error}</p>}

      <div id="resultsDiv" role="status" aria-live="polite" aria-atomic="true"></div>

      <div id="moreResultsDiv" role="status" aria-live="polite" aria-atomic="true">
        {detailsContent}
      </div>
    </>
  );
};

export default SearchResults;