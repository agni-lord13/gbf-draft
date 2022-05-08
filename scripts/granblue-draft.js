/**
 * 
 */

const MIN_TEAMS = 2;
const MAX_TEAMS = 10;
const MIN_ROUNDS = 5;
const MAX_ROUNDS = 30;

const IMG_PLACEHOLDER = "resources/placeholder_icon.jpg";

var teams = new Map();
var totalRounds = MIN_ROUNDS;

var currentPick = 1;
var totalRounds = 5;

const calItemsPerRow = 8;

$(function () {
//	let width = $(window).width();
//	console.log(width);
  $("#welcomeModal").modal("show");

  $("#buildDraftBtn").click(function () {
    let processBtn = $(this);

    processBtn
      .attr("disabled", "")
      .empty()
      .html(
        "<span class='spinner-border spinner-border-sm' role='status' aria-hidden='true'></span> Loading..."
      );

    let fetchBar = $("#fetchProgress .progress-bar");

    fetchTotalCharacters()
      .then((pResult) => {
        let totalChars = pResult.cargoquery[0].title.total;

        console.log("DEBUG: Fetch total characters: " + totalChars);

        let processCounter = 0;

        let offset = 0;

        let dataQueries = [];

        while (offset < totalChars) {
          dataQueries.push(
            fetchCharacters(offset).then((pResultData) => {
              processCounter += pResultData.length;

              let progress = Math.floor((processCounter / totalChars) * 100);

              fetchBar
                .css("width", progress + "%")
                .html("Fetching Information... " + progress + "%");

              return pResultData;
            })
          );

          offset += 500;
        }

        return Promise.all(dataQueries);
      })
      .then((pCharacterResults) => {
        pCharacterResults.forEach((pCharBatch) => {
          pCharBatch.forEach((pCharData) => {
            CHAR_DATA.set(pCharData.id, pCharData);
          });
        });
      })
      .then(() => {
        Array.from(CHAR_DATA.values()).forEach((pChar, pIndex) => {
              let charImg = new Image();
              charImg.onerror = () => {
            	  
            	  charImg.src = IMG_PLACEHOLDER;
              }
              charImg.src = buildUrl(pChar.id);
          
          		$("#draft-selections").append(buildCharSelection(pChar, charImg));
        });
      })
      .done(() => {
    	  
        for (let i = 0; i < calItemsPerRow; i++) {
          $("#draft-selections").append(createSelectionPlaceholder(i));
        }

        updatePlaceholders();

        processBtn.html("Complete");

        $("#welcomeModal").modal("hide");

        addTeamName("Grandcypher");
        addTeamName("The Society");
        addTeamName("Eternals");
        addTeamName("Evokers");
        addTeamName("Zodiacs");
        addTeamName("Enforcers");
        addTeamName("Luminary Knights");
        addTeamName("Primarchs");

        $("#teamsConfigModal").modal("show");
      });

    return;
  });

  $("#team-name-input")
    .on("input", function () {
      let teamName = $(this).val();

      $("#teamNameBtn").prop("disabled", teamName.length === 0);
    })
    .on("keyup", function (pE) {
      if (pE.which === 13) {
        submitTeamName();
      }
    });

  $("#teamNameBtn").click(function () {
    submitTeamName();
  });

  $(document).on("click", ".delete-name", function () {
    $(this).closest(".team-name-option").remove();

    refreshCrewSetupView();
  });

  $("#acceptTeamsBtn").click(function () {
    $("#teamsConfigModal").modal("hide");

    let teamOrderView = $("#teamOrderSetup").empty();

    $("#team-list .team-name-option").each(function (pIndex) {
      let teamName = $(this).data("name");
      teamOrderView.append(
        "<li class='list-group-item team-name-order' data-id='" +
          (pIndex + 1) +
          "' data-name='" +
          teamName +
          "'>" +
          teamName +
          "</li>"
      );
    });

    refreshRoundsSelection();

    $("#draftConfigModal").modal("show");
  });

  $("#teamOrderSetup").sortable();

  $("#superLotteryTgl").change(function () {
    let isSuperLottoEnabled = $(this).is(":checked");

    $("#teamOrderSetup").sortable("option", "disabled", isSuperLottoEnabled);
    $("#executeLottoBtn").prop("disabled", isSuperLottoEnabled);
  });

  $("#executeLottoBtn").click(function () {
    let teamNames = $(".team-name-order").toArray();

    let orderView = $("#teamOrderSetup");
    orderView.empty();

    while (teamNames.length > 0) {
      let lottoNumber = Math.floor(Math.random() * teamNames.length);

      orderView.append(teamNames.splice(lottoNumber, 1));
    }
  });

  $("#rndExclCollabsSwtch, #restrictVerSwitch, #roundsElement input, #roundsRarities input, #roundsGenders input").change(
    function () {
      refreshRoundsSelection();
    }
  );

  $("#configureTeamsBtn").click(function () {
    $("#draftConfigModal").modal("hide");

    $("#teamsConfigModal").modal("show");
  });

  $("#startDraftBtn").click(function () {
    teams.clear();

    let teamOrder = new Map();

    $(".team-name-order").each(function (pIndex) {
      let orderView = $(this);
      let teamData = new Object();
      teamData.id = orderView.data("id");
      teamData.name = orderView.data("name");

      teams.set(teamData.id, teamData);

      teamOrder.set(pIndex, teamData);
    });

    refreshTeamOptions(Array.from(teamOrder.values()));

    let isSuperLottery = $("#superLotteryTgl").is(":checked");
    let totalRounds = $("#totalRoundsSelect").val();
    let totalTeams = teams.size;

    let draftOrderView = $("#draft-order");

    draftOrderView.empty();

    for (let aRound = 0; aRound < totalRounds; aRound++) {
      draftOrderView.append(
        "<header class='round-header'>Round " + (aRound + 1) + "</header>"
      );
      let draftOrder = [];

      if (isSuperLottery) {
        draftOrder.push(...executeLottery(Array.from(teams.values())));
      } else {
        draftOrder.push(...Array.from(teamOrder.values()));
      }

      draftOrder.forEach(function (pTeam, pIndex) {
        let pick = aRound * draftOrder.length + (pIndex + 1);

        $("#draft-order").append(buildPickView(pick, pTeam, draftOrder.length));
      });
    }

    cleanDraft();

    $("#draftConfigModal").modal("hide");
    
    logEvent("The Granblue Fantasy Draft has now begun...")
    
    let currentTeam = fetchTeamByPick(currentPick);
    
    logEvent(teams.get(currentTeam).name + " is now on the clock.");
  });

  $(document).on(
    "click",
    ".character-select:not([data-placeholder])",
    function () {
      if (parseInt($("#viewModeSelect").val()) !== 0) {
        return;
      }

      if ($(this).attr("data-team-select") || $(this).hasClass("char-lock")) {
        return;
      }

      // draft is complete
      if (currentPick > $(".pick-view").length) {
        return;
      }

      let characterSelect = $(this);

      let verifySelection = $("#pickVerifySwtch").is(":checked");

      if (verifySelection) {
        let verifyPromise = new Promise(function (resolve, reject) {
          $("#confirm-pick-order").html(getSuffix(currentPick));

          let teamName = teams.get(fetchTeamByPick(currentPick)).name;

          $("#confirm-pick-team").html(teamName);
          $("#confirm-pick-character").html(
            CHAR_DATA.get(characterSelect.attr("data-id")).name
          );
          $("#verify-pick-modal").modal("show");

          $("#confirm-pick-btn").click(function () {
            resolve("Success");
          });

          $("#cancel-pick-btn").click(function () {
            reject("Canceled");
          });
        })
          .then(function (val) {
            selectCharacter(characterSelect);
          })
          .catch(function (error) {
            return;
          });
      } else {
        selectCharacter(characterSelect);
      }
    }
  );

  $("#viewModeSelect").change(function () {
    let draftSelectionView = $("#draft-selections");
    let viewMode = parseInt($(this).val());
    let allCharacters = $(".character-select:not([data-placeholder])");
    let selectionModeView = $("#selectionModeSwtch");

    let actionControls = [
      $("#selectionModeSwtch"),
      $("#pickVerifySwtch"),
      $("#filterBtn"),
      $("#tradeBtn"),
      $("#resetDraftBtn")
    ];

    let pickOrderViews = $(".pick-view");

    draftSelectionView.removeClass("team-view");
    pickOrderViews.removeClass("d-none");

    if (viewMode === 0) {
      actionControls.forEach((aControl) => aControl.prop("disabled", false));

      applyFilters();

      scrollToPick(currentPick);
    } else {
      draftSelectionView.addClass("team-view");

      actionControls.forEach((aControl) => aControl.prop("disabled", true));

      allCharacters.hide();

      let currentSort = $("#charactersSort select").val();

      if (["pick-asc", "pick-desc"].includes(currentSort)) {
        sortCharacters();
      }

      allCharacters
        .filter(function () {
          let aChar = $(this);
          if (aChar.data("team-current")) {
            let isMatch =
              parseInt(aChar.attr("data-team-current")) === viewMode;

            return isMatch;
          }

          return false;
        })
        .show();

      pickOrderViews
        .filter(function () {
          let pickOrderView = $(this);

          let result =
            parseInt(pickOrderView.attr("data-team-current")) !== viewMode;
          return result;
        })
        .addClass("d-none");

      scrollToPick(1);
    }

    updatePlaceholders();
  });

  $(
    "#selectionModeSwtch, #filterCollab, .filter-gender, .filter-rarity, .filter-race, .filter-element"
  ).change(function () {
    applyFilters();

    updatePlaceholders();
  });

  $("#clearFiltersBtn").click(function () {
    $("#filterCollab").prop("checked", true);
    $(".filter-gender, .filter-rarity, filter-race, .filter-element").prop(
      "checked",
      false
    );

    applyFilters();
  });

  $("#charactersSort select").change(function () {
    sortCharacters();
  });

  $("#tradeModal select").change(function () {
    let tradeId = $(this).data("trade-team");
    let selectedVal = $(this).val();

    let disableTeam = tradeId === "a" ? "b" : "a";

    let otherSelect = $(
      "#tradeModal select[data-trade-team='" + disableTeam + "']"
    );

    otherSelect
      .find("option:not([value='0'])[disabled]")
      .removeAttr("disabled");

    otherSelect
      .find("option[value='" + selectedVal + "']")
      .attr("disabled", "");

    refreshTradeOptions();
  });

  ["a", "b"].forEach(function (pId) {
    $(".trade-options[data-trade-team='" + pId + "']").sortable({
      connectWith: ".trade-offers[data-trade-team='" + pId + "']",
      update: function (pEvent, pTradeAsset) {
        sortTradeAssets($(this));
      },
      disabled: true
    });

    $(".trade-offers[data-trade-team='" + pId + "']").sortable({
      connectWith: ".trade-options[data-trade-team='" + pId + "']",
      update: function (pEvent, pTradeAsset) {
        sortTradeAssets($(this));

        let totalTradeOffers = $(".trade-offers .trade-asset").length;

        let confirmTradeSwtch = $("#confirmTradeSwitch");

        confirmTradeSwtch.prop("disabled", totalTradeOffers === 0);
      },
      disabled: true
    });
  });

  $("#tradeBtn").click(function () {
    proposeTrades();
  });

  $("#confirmTradeSwitch").change(function () {
    let isConfirmed = $(this).is(":checked");
    let acceptTradeBtn = $("#acceptTradeBtn");

    $(".trade-options, .trade-offers").sortable(
      "option",
      "disabled",
      isConfirmed
    );

    if (isConfirmed) {
      acceptTradeBtn.removeAttr("disabled");
    } else {
      acceptTradeBtn.attr("disabled", "");
    }
  });

  $("#resetTradeBtn").click(function () {
    refreshTradeOptions();
  });

  $("#acceptTradeBtn").click(function () {
	  logEvent("Trade Accepted");
	  
    $(".trade-offers").each(function () {
      let receiveTeam = parseInt($(this).attr("data-receive-team"));

      let logTrade = [];
      $(this)
        .find(".trade-asset")
        .each(function () {
          let charId = $(this).attr("data-character-id");
          let pickOrder = $(this).data("pick-order");
          let pickView = $(".pick-view[data-pick-order='" + pickOrder + "']");
          pickView.attr("data-team-current", receiveTeam);

          if (typeof charId !== "undefined") {
        	logTrade.push(CHAR_DATA.get(charId).name);
            let selectTeam = pickView.attr("data-team-select");

            if (receiveTeam === selectTeam) {
              $(pickView).removeClass("traded").find(".selection-info").empty();
            } else {
              $(pickView)
                .addClass("traded")
                .find(".selection-info")
                .html(
                  buildSelectionInfo(pickOrder, teams.get(receiveTeam), true)
                )
                .prop(
                  "title",
                  CHAR_DATA.get(charId).pageTitle +
                    "\nPick " +
                    pickOrder +
                    " (T)"
                );
            }

            $(".character-select[data-id='" + charId + "']")
              .attr("data-team-current", receiveTeam)
              .find(".selection-info")
              .html(
                buildSelectionInfo(
                  pickOrder,
                  teams.get(receiveTeam),
                  receiveTeam !== selectTeam
                )
              );
          } else {
            let originTeam = pickView.data("team-origin");
            let pickDisplay = pickView.find(".team");

            let pickText = teams.get(receiveTeam).name;
            let logText = "";

            if (originTeam !== receiveTeam) {
              pickText += " (" + teams.get(originTeam).name + ")";
              logText =  teams.get(originTeam).name + " ";
            }

            pickDisplay.html(pickText);
            
            
            let currentRound = calculateRound(currentPick);
            
            let pickRound = calculateRound(pickOrder);
            
            if (currentRound == pickRound) {
            	logText += getSuffix(pickOrder) + " Pick";
            } else {
            	logText += getSuffix(pickRound) + " Round (Pick " + pickOrder + ")";
            }
            
            logTrade.push(logText);
          }
        });
      
      logEvent(teams.get(receiveTeam).name + " receives [" + logTrade.join(", ") + "]");
    });
    

    refreshTradeOptions();
    updatePickDisplay(currentPick, true);
    
	 let currentTeam = fetchTeamByPick(currentPick);
	 
	 logEvent(teams.get(currentTeam).name + " is on the clock");
  });

  $("#resetDraftBtn").click(() => {
    $("#confirmResetConfigs").prop("checked", false);

    $("#resetDraftModal").modal("show");
  });

  $("#confirmResetBtn").click(() => {
	  logEvent("The draft is being reset");
	    console.log("------------------------")

    let isResetConfigs = $("#confirmResetConfigs").is(":checked");

    if (isResetConfigs) {
      $("#teamsConfigModal").modal("show");
    } else {
      cleanDraft();
    }
  });
  
  $(window).resize(() => {
  	updatePlaceholders();
  });
});

function buildTeam(pName) {
  if (teams.size <= MAX_TEAMS) {
    var teamData = new Object();
    teamData.name = pName;
    teamData.id = teams.size + 1;

    teams.set(teamData.id, teamData);
  }
}

function selectCharacter(pCharacterSelect) {
  let pickTeam = fetchTeamByPick(currentPick);

  let isHide = $("#selectionModeSwtch").is(":checked");
  let isLimitMode = $("#restrictVerSwitch").is(":checked");

  let charId = pCharacterSelect.data("id");

  let charData = CHAR_DATA.get(charId.toString());

  let teamData = teams.get(pickTeam);

  let currentRound = Math.ceil(currentPick / teams.size);

  let titleName = charData.pageTitle;

  pCharacterSelect
    .attr("data-team-select", pickTeam)
    .attr("data-team-current", pickTeam)
    .attr("data-pick-order", currentPick)
    .attr("title", titleName + "\nPick " + currentPick)
    .find(".selection-info")
    .html(buildSelectionInfo(currentPick, teamData, false));

  let relatedChars = $(
    ".character-select:not([data-id='" +
      charData.id +
      "'])[data-char-id='" +
      charData.charid +
      "']"
  );

  if (isLimitMode) {
    relatedChars.addClass("char-lock");
  }

  if (isHide) {
    pCharacterSelect.hide();

    if (isLimitMode) {
      relatedChars.hide();
    }
  }

  setSelectedPick(currentPick, charData);

  updatePlaceholders();
  
  logEvent("With the " + getSuffix(currentPick) + " pick, the crew " + teamData.name + " selects " + charData.pageTitle);

  currentPick++;

  $(".pick-view.current").removeClass("current");

  if (currentPick > $(".pick-view").length) {
    $("#draftStatus").html("The Draft has Concluded");
    logEvent("The Granblue Fantasy Draft is now concluded");
   
    logTeamsStatus();
    
    return;
  } else {
	 let currentTeam = fetchTeamByPick(currentPick);
	 
	 logEvent(teams.get(currentTeam).name + " is now on the clock");
  }

  updatePickDisplay(currentPick, true);
}

function executeLottery(pTeams) {
  var candidates = pTeams.slice();
  var lottoOrder = new Array();

  while (candidates.length > 0) {
    var order = Math.floor(Math.random() * candidates.length);
    var select = candidates[order];
    candidates.splice(order, 1);

    lottoOrder.push(select);
  }

  return lottoOrder;
}

function buildDraftOrder(pMaxRounds, pTeamOrder) {
  for (let round = 1; round <= pMaxRounds; round++) {
    $("#draft-order").append(
      "<header class='round-header'>Round " + round + "</header>"
    );
    for (let pick = 0; pick < pTeamOrder.length; pick++) {
      let order = (round - 1) * pTeamOrder.length + (pick + 1);

      $("#draft-order").append(
        buildPickView(order, teams.get(pTeamOrder[pick]))
      );

      $("#draft-order .pick-view")
        .filter(function () {
          return parseInt($(this).data("pick-order")) % teams.size !== 0;
        })
        .css("border-bottom", ".1em solid black");
    }
  }
}

function buildPickView(pOrder, pTeamData, pTotalTeams) {
  return (
    "<div class='d-flex pick-view flex-grow-0 " +
    (pOrder % pTotalTeams == 0 ? "" : "border-bottom border-dark") +
    "' " +
    "data-pick-order='" +
    pOrder +
    "' data-team-origin='" +
    pTeamData.id +
    "' data-team-current='" +
    pTeamData.id +
    "'>" +
    "<div class='d-flex flex-column pick-order'><div class='pick-label'>Pick</div><div class='pick-id'>" +
    pOrder +
    "</div></div>" +
    //"<div class='d-flex flex-grow-1 pick-info'>" +
    "<div class='d-flex flex-grow-1 team'>" +
    pTeamData.name +
    "</div>" +
    "<div class='d-flex flex-grow-0 flex-shrink-0 char-select'>" +
    "<img src='" +
    IMG_PLACEHOLDER +
    "'>" +
    "<div class='selection-info'></div>" +
    "</div>" +
    "</div>"
  );
}

function updatePickDisplay(pCurrentPick, pScrollTo) {
  let currentRound = Math.ceil(pCurrentPick / totalRounds);

  $("#currentRound").html("Round " + currentRound);
  $("#currentPick").html("Pick " + pCurrentPick);

  let teamId = fetchTeamByPick(pCurrentPick);

  $("#currentTeam").html(teams.get(teamId).name);
  $("#draftStatus").html("On the Clock");

  $(".pick-view.current").removeClass("current");

  $(".pick-view[data-pick-order='" + pCurrentPick + "']").addClass("current");

  if (!pScrollTo) {
    return;
  }

  scrollToPick(pCurrentPick);
}

function scrollToPick(pCurrentPick) {
  let offset = 0;

  if (pCurrentPick === 1) {
    offset = -1;
  } else {
    let tRounds = Math.ceil((pCurrentPick - 1) / teams.size) - 1;
    $("#draft-order .round-header")
      .slice(0, tRounds)
      .each(function () {
        offset += $(this).outerHeight();
      });

    $("#draft-order .pick-view")
      .slice(0, Math.max(0, pCurrentPick - 2))
      .each(function () {
        offset += $(this).outerHeight();
      });
  }

  $("#draft-order").animate({
    scrollTop: offset
  });
}

function fetchTeamByPick(pPick) {
  let teamId = parseInt(
    $(".pick-view[data-pick-order='" + pPick + "']").attr("data-team-current")
  );

  return teamId;
}

function buildCharSelection(pCharacter, pImg) {
  return createSelectionView(
    cleanName(pCharacter.pageTitle),
    pCharacter,
    null,
    pImg
  );
}

function cleanName(pName) {
  return pName.replaceAll("'", "&#39;");
}

function createSelectionPlaceholder(pId) {
  let image = new Image();
  image.src = IMG_PLACEHOLDER;
  return createSelectionView(null, null, pId, image);
}

function createSelectionView(pTitle, pCharacter, pPlaceholder, pImg) {
  let view = "<div class='character-select'";

  if (pPlaceholder !== null) {
    view += " data-placeholder='" + pPlaceholder + "' ";
  }

  if (pCharacter !== null) {
    view += " data-id='" + pCharacter.id + "' ";

    let charId = pCharacter.id;

    if (pCharacter.hasOwnProperty("charid")) {
      charId = pCharacter.charid;
    }
    view += " data-char-id='" + charId + "' ";

    view += " data-race='" + pCharacter.race + "' ";
    view += " data-gender='" + pCharacter.gender + "' ";
    view += " data-element='" + pCharacter.element + "' ";
    view += " data-rarity='" + pCharacter.rarity + "' ";

    let series = "none";

    if (pCharacter.hasOwnProperty("series")) {
      series = pCharacter.series;
    }

    view += " data-series='" + series + "' ";

    let releaseDate = pCharacter.releaseDate;
    view += " data-release-date='" + releaseDate + "' ";

    let titleName = pCharacter.pageTitle.replace("'", "&apos;");
    let pageName = titleName.replace("\u039c", "Mu");
    view += " data-name-sort='" + pageName + "' ";
    view += "title='" + titleName + "'";
  }

  view += ">";

  view += "</div>";

  let charView = $(view);

  if (pImg !== null) {
    charView.append(pImg);
    charView.append("<div class='selection-info'></div>");
  }

  return charView;
}

function updatePlaceholders() {
  let availableCount = $(".character-select:not([data-placeholder]):visible")
    .length;
  
  let charsPerRow = $("#draft-pool").css("--chars-per-row");
  
  console.log("Chars Per Row: " + charsPerRow);

  let toHide = availableCount % charsPerRow;

  if (toHide === 0) {
    toHide = calItemsPerRow;
  }

  $(".character-select[data-placeholder]").each(function () {
    let ph = $(this);

    if (parseInt(ph.data("placeholder")) < toHide) {
      ph.hide();
    } else {
      ph.show();
    }
  });
}

function setSelectedPick(pPickOrder, pSelectedCharacter) {
  let pickView = $(".pick-view[data-pick-order='" + pPickOrder + "']");
  pickView.attr("data-char-select", pSelectedCharacter.id);
  let currentTeam = parseInt(pickView.attr("data-team-current"));
  pickView.attr("data-team-select", currentTeam);

  pickView
    .find(".char-select")
    .attr("title", pSelectedCharacter.pageTitle)
    .find("img")
    .attr("src", buildUrl(pSelectedCharacter.id));
}

function getSuffix(pPick) {
  var j = pPick % 10,
    k = pPick % 100;
  if (j == 1 && k != 11) {
    return pPick + "st";
  }
  if (j == 2 && k != 12) {
    return pPick + "nd";
  }
  if (j == 3 && k != 13) {
    return pPick + "rd";
  }

  return pPick + "th";
}

function updateFilters() {
  let includeCollabs = $("#collabSwitch").is(":checked");

  let selectedGenders = $("#filter-modal [id^='gender']:checked")
    .map(function () {
      return this.value;
    })
    .get();

  let selectedRarities = $("#filter-modal [id^='rarity']:checked")
    .map(function () {
      return this.value;
    })
    .get();

  let selectedRaces = $("#filter-modal [id^='race']:checked")
    .map(function () {
      return this.value;
    })
    .get();

  let selectedElements = $("#filter-modal [id^='element']:checked")
    .map(function () {
      return this.value;
    })
    .get();

  let hasFilters =
    !includeCollabs ||
    selectedGenders.length > 0 ||
    selectedRarities.length > 0 ||
    selectedRaces.length > 0 ||
    selectedElements.length > 0;

  $("#filterBtn")
    .removeClass(hasFilters ? "btn-primary" : "btn-warning")
    .addClass(hasFilters ? "btn-warning" : "btn-primary");

  $(".character-select:not([data-placeholder])").each(function () {
    if (!includeCollabs && $(this).data("series") === "tie-in") {
      $(this).addClass("filtered");
      return;
    }

    let genderMatch = false;

    if (selectedGenders.length > 0) {
      let cGenders = $(this).data("gender").split("");

      for (mGender of cGenders) {
        if (selectedGenders.includes(mGender)) {
          genderMatch = true;
          break;
        }
      }
    } else {
      genderMatch = true;
    }

    if (!genderMatch) {
      $(this).addClass("filtered");
      return;
    }

    if (
      selectedRarities.length > 0 &&
      !selectedRarities.includes($(this).data("rarity"))
    ) {
      $(this).addClass("filtered");
      return;
    }

    let raceMatch = false;

    if (selectedRaces.length > 0) {
      let charRaces = $(this).data("race").split(",");

      for (aRace of charRaces) {
        if (selectedRaces.includes(aRace)) {
          raceMatch = true;
          break;
        }
      }
    } else {
      raceMatch = true;
    }

    if (!raceMatch) {
      $(this).addClass("filtered");
      return;
    }

    if (
      selectedElements.length > 0 &&
      !selectedElements.includes($(this).data("element"))
    ) {
      $(this).addClass("filtered");
      return;
    }

    $(this).removeClass("filtered");
  });

  updatePlaceholders();
}

function sortPicks(pA, pB, pIsAsc) {
  let sortA = $(pA).is("[data-pick-order]")
    ? parseInt($(pA).attr("data-pick-order"))
    : null;
  let sortB = $(pB).is("[data-pick-order]")
    ? parseInt($(pB).attr("data-pick-order"))
    : null;

  if (sortA === sortB) {
    return 0;
  }

  if (sortA === null) {
    return 1;
  }

  if (sortB === null) {
    return -1;
  }

  if (pIsAsc) {
    return sortA > sortB ? 1 : -1;
  } else {
    return sortA > sortB ? -1 : 1;
  }
}

function sortCharacters() {
  let sortType = $("#charactersSort option:selected").attr("value");

  let sortedChars = $(".character-select:not([data-placeholder])").sort(
    function (a, b) {
      switch (sortType) {
        case "alph-desc":
          return $(b)
            .data("name-sort")
            .toLowerCase()
            .localeCompare($(a).data("name-sort").toLowerCase());
        case "alph-asc":
          return $(a)
            .data("name-sort")
            .toLowerCase()
            .localeCompare($(b).data("name-sort").toLowerCase());
        case "latest":
          return $(b)
            .data("release-date")
            .localeCompare($(a).data("release-date"));
        case "pick-desc":
          return sortPicks(a, b, false);
        case "pick-asc":
          return sortPicks(a, b, true);
        default:
          return $(a)
            .data("release-date")
            .localeCompare($(b).data("release-date"));
      }
    }
  );

  let placeholders = $(".character-select[data-placeholder]");

  $("#draft-selections").append(sortedChars).append(placeholders);
}

function buildTradeView(pPickOrder, pOriginTeam, pCurrentTeam, pCharacter) {
  let tradeView = "<div class='list-group-item trade-asset'";
  tradeView + " data-current-team='" + pCurrentTeam.id + "' ";

  if (pCharacter !== null) {
    tradeView += " data-character-id='" + pCharacter.id + "'";
  }

  tradeView += " data-pick-order='" + pPickOrder + "'";

  tradeView += ">";

  if (pCharacter !== null) {
    tradeView += pCharacter.pageTitle + " (" + pPickOrder + ")";
  } else {
    let pickRound = Math.ceil(pPickOrder / teams.size);
    let currentRound = Math.ceil(currentPick / teams.size);

    if (pickRound == currentRound) {
      tradeView += "Pick " + pPickOrder;

      if (pCurrentTeam.id !== pOriginTeam.id) {
        tradeView += " (" + pOriginTeam.name + ")";
      }
    } else {
      if (pCurrentTeam.id !== pOriginTeam.id) {
        tradeView += pOriginTeam.name + " ";
      }
      tradeView += getSuffix(pickRound) + " Round (" + pPickOrder + ")";
    }
  }

  tradeView += "</div>";

  return tradeView;
}

function refreshTradeOptions() {
  let canTrade = true;

  $("#tradeModal select").each(function () {
    let tradeId = $(this).attr("data-trade-team");
    let selectedTeam = $(this).find("option:selected").attr("value");

    let tradeTeamOptions = $(
      "#tradeModal .trade-options[data-trade-team='" + tradeId + "']"
    );

    tradeTeamOptions.empty();

    let tradeTeamOffers = $(
      "#tradeModal .trade-offers[data-trade-team='" + tradeId + "']"
    );
    tradeTeamOffers.empty();

    if (parseInt(selectedTeam) === 0) {
      canTrade &= false;
      return true;
    }

    $(
      "#tradeModal .trade-offers:not([data-trade-team='" + tradeId + "'])"
    ).attr("data-receive-team", selectedTeam);

    $(".pick-view[data-team-current='" + selectedTeam + "']").each(function () {
      let pickView = $(this);

      let charData = null;

      if (pickView.attr("data-char-select")) {
        let charId = pickView.attr("data-char-select");
        charData = CHAR_DATA.get(charId);
      }

      let tradeView = $(
        buildTradeView(
          pickView.data("pick-order"),
          teams.get(pickView.data("team-origin")),
          teams.get(parseInt(pickView.attr("data-team-current"))),
          charData
        )
      ).attr("data-trade-id", tradeId);
      tradeTeamOptions.append(tradeView);
    });

    sortTradeAssets(tradeTeamOptions);
  });

  $(".trade-options, .trade-offers").sortable("option", "disabled", !canTrade);

  $("#confirmTradeSwitch").prop("checked", false).prop("disabled", true);
  $("#acceptTradeBtn").attr("disabled", true);
}

function proposeTrades() {
  $("#tradeModal select").each(function () {
    $(this).find("option:not([value='0'])[disabled]").removeAttr("disabled");

    $(this).find("option[value='0']").prop("selected", true);
  });

  $(".trade-options, .trade-offers")
    .removeAttr("data-receive-team")
    .empty()
    .sortable("option", "disabled", true);

  $("#confirmTradeSwitch").removeAttr("checked").attr("disabled", "");

  $("#acceptTradeBtn").attr("disabled", "");

  $("#tradeModal").modal("show");
}

function sortTradeAssets(pAssets) {
  let sortedAssets = $(pAssets)
    .find(".trade-asset")
    .sort(function (a, b) {
      let hasCharA = typeof $(a).data("character-id") !== "undefined";
      let hasCharB = typeof $(b).data("character-id") !== "undefined";

      if (hasCharA && !hasCharB) {
        return 1;
      } else if (!hasCharA && hasCharB) {
        return -1;
      } else {
        return $(a).data("pick-order") - $(b).data("pick-order");
      }
    });

  $(pAssets).empty().append(sortedAssets);
}

function buildSelectionInfo(pPickOrder, pTeamInfo, pIsTraded) {
  let sectionInfo = "<div>";

  sectionInfo += "Pick " + pPickOrder;

  if (pIsTraded) {
    sectionInfo += " (T)";
  }
  sectionInfo += "</div>";

  sectionInfo += "<div>" + pTeamInfo.name + "</div>";

  return sectionInfo;
}

function submitTeamName() {
  let teamNameInput = $("#team-name-input");
  let teamName = teamNameInput.val().trim();

  teamNameInput.val("");
  $("#teamNameBtn").prop("disabled", true);

  addTeamName(teamName);
}

function addTeamName(pTeamName) {
  if (
    pTeamName.length === 0 ||
    $("#team-list .team-name-option").length == MAX_TEAMS
  ) {
    return;
  }

  if (
    $("#team-list .team-name-option[data-name*='" + pTeamName + "' i]")
      .length === 0
  ) {
    let nameOption = $(
      "<div class='team-name-option' data-name='" +
        pTeamName +
        "'>" +
        pTeamName +
        "<span class='delete-name '>&times;</span></div>"
    );
    $("#team-list").append(nameOption);
  }

  refreshCrewSetupView();
}

function refreshCrewSetupView() {
  let currentTeamsTotal = $("#team-list .team-name-option").length;

  $("#acceptTeamsBtn").prop(
    "disabled",
    currentTeamsTotal < MIN_TEAMS || currentTeamsTotal > MAX_TEAMS
  );
}

function refreshRoundsSelection() {
  let teamTotal = $(".team-name-option").length;

  let availableChars = $(".character-select:not([data-placeholder])");
  
  let roundsRarities = $("#roundsRarities input:checked").map(function() {
	  return this.value;
  }).get();
  
  if (roundsRarities.length > 0) {
	  availableChars = availableChars.filter((pIndex, pChar) => {
		  return roundsRarities.includes($(pChar).data("rarity"));
	  });
  }
  
  let roundsGenders = $("#roundsGenders input:checked").map(function() {
	  return this.value;
  }).get();
  
  if (roundsGenders.length > 0) {
	  availableChars = availableChars.filter((pIndex, pChar) => {
		  return roundsGenders.includes($(pChar).data("gender"));
	  });
  }

  let roundsElements = $("#roundsElement input:checked")
    .map(function () {
      return this.value;
    })
    .get();

  if (roundsElements.length > 0) {
    roundsElements.push("Any");

    availableChars = availableChars.filter(function (pIndex, pChar) {
      return roundsElements.includes($(pChar).data("element"));
    });
  }

  let isCollabExcluded = $("#rndExclCollabsSwtch").is(":checked");

  if (isCollabExcluded) {
    availableChars = availableChars.filter(function () {
      return $(this).data("series") !== "tie-in";
    });
  }

  let isRestrictVersions = $("#restrictVerSwitch").is(":checked");

  if (isRestrictVersions) {
    let unqIds = new Set();

    availableChars = availableChars.filter(function () {
      let charId = $(this).attr("data-char-id");

      if (charId.includes(";")) {
        return false;
      }

      if (unqIds.has(charId)) {
        return false;
      } else {
        unqIds.add(charId);

        return true;
      }
    });
  }

  let totalChars = availableChars.length;

  let maxRounds = Math.min(MAX_ROUNDS, Math.floor(totalChars / teamTotal));

  let roundsSelectView = $("#totalRoundsSelect");
  let currentSelected = roundsSelectView.is(":empty")
    ? MIN_ROUNDS
    : Math.min(roundsSelectView.val(), maxRounds);

  roundsSelectView.empty();

  for (let aRound = MIN_ROUNDS; aRound <= maxRounds; aRound++) {
    roundsSelectView.append(
      "<option value='" +
        aRound +
        "' " +
        (aRound == currentSelected ? "selected" : "") +
        ">" +
        (aRound < 10 ? "0" + aRound : aRound) +
        "</option>"
    );
  }

  $("#startDraftBtn").prop("disabled", roundsSelectView.is(":empty"));
}

function refreshTeamOptions(pTeams) {
  // update selection view mode
  let selectMode = $("#viewModeSelect");
  let tradeTeamsSelects = $(".trade-teams-select");

  selectMode.children("option:not([value = '0'])").remove();
  selectMode.append("<hr>");
  tradeTeamsSelects.find("option:not([value = '0'])").remove();

  pTeams.forEach(function (pTeam) {
    let teamOption =
      "<option value ='" + pTeam.id + "'>" + pTeam.name + "</option>";
    selectMode.append(teamOption);
    tradeTeamsSelects.append(teamOption);
  });
}

function applyFilters() {
  let isHide = $("#selectionModeSwtch").is(":checked");

  let includeCrossovers = $("#filterCollab").is(":checked");

  let genderFilters = retreiveFilter("gender");

  let rarityFilters = retreiveFilter("rarity");

  let raceFilters = retreiveFilter("race");

  let elementFilters = retreiveFilter("element");

  let filterCount =
    (includeCrossovers ? 0 : 1) +
    genderFilters.length +
    rarityFilters.length +
    raceFilters.length +
    elementFilters.length;

  $("#filterCountWarn").html(filterCount > 0 ? filterCount : "");

  $(".character-select:not([data-placeholder])")
    .show()
    .filter(function (pIndex, pChar) {
      let aChar = $(pChar);

      if (
        isHide &&
        (aChar.attr("data-team-current") || aChar.hasClass("char-lock"))
      ) {
        return true;
      }

      if (!includeCrossovers && aChar.data("series") === "tie-in") {
        return true;
      }

      if (genderFilters.length > 0) {
        let charGenders = aChar.data("gender").split("");

        let isGenderMatch = charGenders.filter(function (pGender) {
          return genderFilters.includes(pGender);
        });

        if (isGenderMatch.length == 0) {
          return true;
        }
      }

      if (
        rarityFilters.length > 0 &&
        !rarityFilters.includes(aChar.data("rarity"))
      ) {
        return true;
      }

      if (raceFilters.length > 0) {
        let charRaces = aChar.data("race").split(";");

        let isRaceMatch = charRaces.filter((aChar) =>
          raceFilters.includes(aChar)
        );

        if (isRaceMatch.length === 0) {
          return true;
        }
      }

      if (elementFilters.length > 0) {
        elementFilters.push("Any");
        if (!elementFilters.includes(aChar.data("element"))) {
          return true;
        }
      }

      return false;
    })
    .hide();

  updatePlaceholders();
}

function retreiveFilter(pType) {
  return $.map($(".filter-" + pType + ":checked").toArray(), function (pVal) {
    return $(pVal).attr("value");
  });
}

function cleanDraft() {
  let allChars = $(".character-select:not([data-placeholder])");

  allChars.each((pIndex, pCharSelect) => {
    let charSelect = $(pCharSelect);
    charSelect
      .removeClass("char-lock")
      .removeAttr("data-team-select")
      .removeAttr("data-team-current")
      .removeAttr("data-pick-order")
      .prop("title", CHAR_DATA.get(charSelect.attr("data-id")).pageTitle)
      .find(".selection-info")
      .html("");
  });

  $(".pick-view").each((pIndex, pPickView) => {
    let pickView = $(pPickView);
    let originTeam = pickView.data("team-origin");
    pickView
      .removeClass("traded")
      .attr("data-team-current", originTeam)
      .removeAttr("data-char-select")
      .removeAttr("data-team-select")
      .find(".team")
      .html(teams.get(originTeam).name)
      .end()
      .find(".char-select")
      .find("img")
      .attr("src", IMG_PLACEHOLDER)
      .end()
      .find(".selection-info")
      .html("");
  });

  let restrictCharWarning = $("#charRestrictModeAlert");

  restrictCharWarning.addClass("d-none");

  if ($("#restrictVerSwitch").is(":checked")) {
    allChars.filter(function () {
      let charView = $(this);
      if (charView.data("char-id")) {
        if (charView.attr("data-char-id").includes(";")) {
          charView.addClass("char-lock");
        }
      }
    });

    restrictCharWarning.removeClass("d-none");
  }

  currentPick = 1;

  updatePickDisplay(currentPick, true);

  applyFilters();
}

function logEvent(pMessage) {
	console.log("Event: " + pMessage)
}

function calculateRound(pPick) {
	return Math.ceil(pPick / teams.size);
}

function logTeamsStatus() {
    Array.from(teams.values()).forEach((pTeam) => {
    	let teamId = pTeam.id;
    	
    	let teamAssets = [];
    	
    	$(".pick-view[data-team-current='" + teamId + "']").each((pIndex, pAsset) => {
    		let aAsset = $(pAsset);
    		let pickOrder = parseInt(aAsset.attr("pick-order"));
    		
    		let display = "";
    		
    		if (aAsset.attr("data-char-select")) {
    			let aChar = aAsset.attr("data-char-select");
    			let teamSelect = parseInt(aAsset.attr("data-team-select"));
    			
    			display += CHAR_DATA.get(aChar).pageTitle;
    			if (teamSelect !== teamId) {
    				display += " (T)";
    			}
    			teamAssets.push(display);
    		} else {
    			let teamOrigin = parseInt(aAsset.attr("data-team-origin"));
    			
    			if (teamId !== teamOrigin) {
    				display += teams.get(teamOrigin).name + " ";
    			}
    			
    			display += getSuffix(pickOrder) + " Pick";
    			
    			teamAssets.push(display);
    		}
    	});
    	
    	logEvent(pTeam.name + " [" + teamAssets.join(", ") + "]");
    });
}