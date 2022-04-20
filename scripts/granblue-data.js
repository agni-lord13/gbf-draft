/**
 * 
 */

const URL = "https://gbf.wiki/api.php";
const CHAR_DATA = new Map();

const FILTER = "";

function fetchTotalCharacters() {
  return $.ajax({
    url: URL,
    data: {
      action: "cargoquery",
      format: "json",
      limit: "500",
      tables: "characters",
      fields: "COUNT(characters.id)=total",
      origin: "*"
    },
    dataType: "json"
  });
}


function buildUrl(pCharId) {
  return "resources/icons/" + pCharId + "_icon.jpg";
}

function filterBy(pRarities) {
  let filter = "";

  if (pRarities.length > 0) {
    filter = "rarity IN (";
    pRarities.forEach((pRarity, pIndex, pArray) => {
      filter += "'" + pRarity + "'";

      if (pIndex + 1 < pArray.length) {
        filter += ", ";
      }
    });
    filter += ")";
  }

  return filter;
}

function fetchCharacters(pOffset) {
  return $.ajax({
    url: URL,
    data: {
      action: "cargoquery",
      format: "json",
      limit: "500",
      tables: "characters",
      fields:
        "id, charid, name, element, gender, rarity, race, series, _pageTitle = pageTitle, release_date=releaseDate",
      order_by: "characters.release_date DESC",
      offset: pOffset,
      origin: "*"
    },
    dataType: "json"
  }).then((pResult) => {
    let result = $.map(pResult.cargoquery, (pVal, pIndex) => {
      return pVal.title;
    });

    return result;
  });
}

