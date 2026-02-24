import { React } from "jimu-core";

const SearchHeader = () => {
  return (
    <>
      <table width={"80%"}>
        <tr>
          <td>
            <span className="title-text">Search</span>
          </td>
        </tr>
      </table>
      <hr style={{ color: "red", height: 2 }} />
    </>
  );
};

export default SearchHeader;