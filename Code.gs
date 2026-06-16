/**
 * KorvaiSheets Extension — Apps Script Backend
 * 
 * Provides native Google Sheets integration for symmetric Korvai calculations,
 * syllable generation, and educational challenge generation.
 */

// Syllable weight tables and blocks matching the Python orchestral composer engine
var BLOCKS = {
  4: [
    "ta ka dhi mi",
    "ta ka ta ka",
    "ta ki ta ka",
    "dhi mi ta ka",
    "ta ka ta ki",
    "ta din gi na",
    "ta ki ta dhi",
    "gin na thom na",
    "ti ta ka ta",
    "ta ka na ka"
  ],
  3: [
    "ta ki ta",
    "ta di na",
    "dhi mi ta",
    "ta ka ta",
    "ki ta ka",
    "ta ka dhi",
    "ta gi na"
  ],
  2: [
    "ta ka",
    "dhi mi",
    "ta ki",
    "ki ta",
    "ta na",
    "taam",
    "dheem",
    "naam"
  ],
  1: ["ta", "ka", "dhi", "mi", "ki", "ti", "na", "din", "gin", "tin"]
};

// Character mappings for Classical Notation (t,,)
var NOTATION_MAP = {
  "ta": "t", "ka": "k", "dhi": "d", "mi": "m", "ki": "k",
  "ti": "t", "na": "n", "din": "d", "gin": "g", "tin": "t",
  "taam": "t,", "dheem": "d,", "naam": "n,", "thaam": "t,",
  "thoom": "t,", "toom": "t,", "daam": "d,", "deem": "d,",
  "jhem": "j,", "jem": "j,",
  "jenu": "j", "thom": "t", "num": "n", "tom": "t",
  "tha": "t", "thu": "t", "di": "d", "ri": "r", "nu": "n",
  "cu": "c", "gi": "g", "jo": "j", "gu": "g", "ni": "n",
  "la": "l", "lan": "l",
  ",": ",", ";": ",,"
};

/**
 * Adds the custom Korvai Tools menu on sheet load.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Korvai Tools')
      .addItem('Open Playground Sidebar', 'showSidebar')
      .addItem('Generate Rhythmic Challenge', 'promptAndCreateChallenge')
      .addToUi();
}

/**
 * Opens the HTML sidebar.
 */
function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('KorvaiSheets Playground')
      .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Finds all valid (p, c) splits where 3p + 2c = targetMatras.
 */
function getValidSplits(targetMatras) {
  var splits = [];
  var limit = Math.floor(targetMatras / 3);
  for (var p = 1; p <= limit; p++) {
    var rem = targetMatras - (3 * p);
    if (rem >= 2 && rem % 2 === 0) {
      var c = rem / 2;
      splits.push({ p: p, c: c });
    }
  }
  return JSON.stringify(splits);
}

/**
 * Helper to build a syllable string of exactly n matras using the blocks
 */
function fillMatras(n, restRate) {
  var parts = [];
  var remaining = n;
  
  while (remaining > 0) {
    var options = [];
    
    if (remaining >= 4) {
      options = options.concat(BLOCKS[4].map(function(b) { return [4, b]; }));
      options = options.concat(BLOCKS[4].map(function(b) { return [4, b]; }));
    }
    if (remaining >= 3) {
      options = options.concat(BLOCKS[3].map(function(b) { return [3, b]; }));
    }
    if (remaining >= 2) {
      options = options.concat(BLOCKS[2].map(function(b) { return [2, b]; }));
    }
    options = options.concat(BLOCKS[1].map(function(s) { return [1, s]; }));
    
    // Add rests/gaps if restRate is specified
    if (restRate > 0) {
      var restWeight = Math.max(1, Math.floor(options.length * restRate));
      if (remaining >= 3) {
        for (var i = 0; i < restWeight; i++) {
          options.push([3, "; ta"]);
          options.push([3, "ta ;"]);
        }
      }
      if (remaining >= 2) {
        for (var i = 0; i < restWeight; i++) {
          options.push([2, ";"]);
          options.push([2, "ta ,"]);
          options.push([2, ", ta"]);
        }
      }
      if (remaining >= 1) {
        for (var i = 0; i < restWeight * 2; i++) {
          options.push([1, ","]);
        }
      }
    }
    
    if (options.length === 0) break;
    
    var choice = options[Math.floor(Math.random() * options.length)];
    var size = choice[0];
    var chosen = choice[1];
    
    parts.push(chosen);
    remaining -= size;
  }
  
  var rawMatras = parts.join(" ");
  return rawMatras
    .replace(/,/g, " , ")
    .replace(/;/g, " ; ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Formats classical notation by preserving attached commas for long syllables (e.g. t,)
 * and space-padding standalone commas and semicolons.
 */
function formatClassicalNotation(raw) {
  var letters = "tkdmgjcnrl";
  var result = [];
  for (var i = 0; i < raw.length; i++) {
    var char = raw[i];
    var prev = i > 0 ? raw[i - 1].toLowerCase() : "";
    var next = i + 1 < raw.length ? raw[i + 1] : "";
    
    if (char === ',') {
      if (letters.indexOf(prev) !== -1) {
        result.push(',');
        if (next !== ',') {
          result.push(' ');
        }
      } else {
        result.push(' , ');
      }
    } else if (char === ';') {
      result.push(' ; ');
    } else {
      result.push(char);
    }
  }
  return result.join("").replace(/\s+/g, " ").trim();
}

/**
 * Translates phonetic solkattu text to classical notation (e.g. t,k,t)
 */
function translateToNotation(sylStr) {
  var words = sylStr.split(/\s+/);
  var notationParts = [];
  
  for (var i = 0; i < words.length; i++) {
    var w = words[i].trim().toLowerCase();
    if (!w) continue;
    
    if (NOTATION_MAP[w]) {
      notationParts.push(NOTATION_MAP[w]);
    } else {
      // Greedily break down word if run-together
      var j = 0;
      var buffer = "";
      while (j < w.length) {
        var matched = false;
        // Check 2-matra syllables
        for (var key in NOTATION_MAP) {
          if (w.substring(j, j + key.length) === key) {
            buffer += NOTATION_MAP[key];
            j += key.length;
            matched = true;
            break;
          }
        }
        if (!matched) {
          buffer += w[j];
          j++;
        }
      }
      notationParts.push(buffer);
    }
  }
  var rawNotation = notationParts.join("");
  return formatClassicalNotation(rawNotation);
}

/**
 * Generates solkattu syllables for a specific (p, c) split.
 */
function generateSyllables(p, c) {
  // A phrase: moderate rests
  var phrase = fillMatras(p, 0.15);
  // B connector: heavier rests
  var connector = fillMatras(c, 0.40);
  
  return JSON.stringify({
    phrase: phrase,
    connector: connector,
    phraseNotation: translateToNotation(phrase),
    connectorNotation: translateToNotation(connector)
  });
}

/**
 * Writes the generated Korvai values directly into the active row of the spreadsheet.
 */
function writeKorvaiToRow(p, c, phraseNotation, connectorNotation) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var activeCell = sheet.getActiveCell();
  var row = activeCell.getRow();
  
  // Columns:
  // A: p, B: c, C: p, D: c, E: p
  // H: Sum (Total Matras)
  // L: Phrase A, M: Connector B, N: Phrase A, O: Connector B, P: Phrase A
  // R: Sum (Total Matras)
  
  sheet.getRange(row, 1, 1, 5).setValues([[p, c, p, c, p]]); // Col A - E
  sheet.getRange(row, 8).setValue(p * 3 + c * 2); // Col H
  
  sheet.getRange(row, 12, 1, 5).setValues([[phraseNotation, connectorNotation, phraseNotation, connectorNotation, phraseNotation]]); // Col L - P
  sheet.getRange(row, 18).setValue(p * 3 + c * 2); // Col R
  
  // Auto-select the next row for convenience
  sheet.setActiveSelection(sheet.getRange(row + 1, 1));
}

/**
 * Prompt for Tala details and append a challenge block to the sheet.
 */
function promptAndCreateChallenge() {
  var ui = SpreadsheetApp.getUi();
  
  var responseTala = ui.prompt('Korvai Challenge', 'Enter Target Tala Name (e.g., Adi, Rupakam):', ui.ButtonSet.OK_CANCEL);
  if (responseTala.getSelectedButton() !== ui.Button.OK) return;
  var tala = responseTala.getResponseText() || "Adi";
  
  var responseMatras = ui.prompt('Korvai Challenge', 'Enter Target Matra Count (e.g., 32, 64, 24):', ui.ButtonSet.OK_CANCEL);
  if (responseMatras.getSelectedButton() !== ui.Button.OK) return;
  var target = parseInt(responseMatras.getResponseText()) || 64;
  
  // Find valid splits
  var splits = JSON.parse(getValidSplits(target));
  if (splits.length === 0) {
    ui.alert('No valid splits found where 3p + 2c = ' + target + '. Please try another matra count.');
    return;
  }
  
  // Pick a random valid split for the challenge
  var randomSplit = splits[Math.floor(Math.random() * splits.length)];
  var challengeId = Math.floor(Math.random() * 1000);
  
  var challengeData = [
    ["Challenge #" + challengeId + ": Symmetric Korvai for " + tala, ""],
    ["Target Tala Count:", target + " matras"],
    ["Assigned Phrase A Length:", randomSplit.p + " matras"],
    ["Your Tasks:", "1. Calculate the required Connector (B) length. Formula: 3A + 2B = " + target + "\n2. Design a symmetric solkattu for A (" + randomSplit.p + " matras) and B (" + randomSplit.c + " matras)."],
    ["", ""]
  ];
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var range = sheet.getRange(lastRow + 2, 1, challengeData.length, 2);
  range.setValues(challengeData);
  
  // Formatting
  sheet.getRange(lastRow + 2, 1, 1, 2).setFontWeight("bold").setBackground("#d9d2e9").setFontColor("#1155cc");
  ui.alert('Rhythmic Challenge #' + challengeId + ' appended at the bottom of the active sheet!');
}

/**
 * Triggered by sidebar to append a challenge
 */
function insertChallengeFromSidebar(talaName, target, p, c) {
  var challengeId = Math.floor(Math.random() * 1000);
  var challengeData = [
    ["Challenge #" + challengeId + ": Symmetric Korvai for " + talaName, ""],
    ["Target Tala Count:", target + " matras"],
    ["Assigned Phrase A Length:", p + " matras"],
    ["Your Tasks:", "1. Calculate the required Connector (B) length. Formula: 3A + 2B = " + target + "\n2. Design a symmetric solkattu for A (" + p + " matras) and B (" + c + " matras)."],
    ["", ""]
  ];
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var range = sheet.getRange(lastRow + 2, 1, challengeData.length, 2);
  range.setValues(challengeData);
  sheet.getRange(lastRow + 2, 1, 1, 2).setFontWeight("bold").setBackground("#d9d2e9").setFontColor("#1155cc");
}

/**
 * Translates a matra count into phonetic Konnakol syllables.
 * 
 * @param {number} count The number of matras (e.g. 5, 6, 7).
 * @param {string} style Optional. Use 'phonetic' (default) or 'classical' notation.
 * @return {string} Mapped syllables.
 * @customfunction
 */
function SOLKATTU(count, style) {
  if (!count || isNaN(count)) return "";
  style = style || "phonetic";
  
  var activeDict = style === "classical" ? {
    1: ",",
    2: "t,",
    3: "t,,",
    4: "t,,,",
    5: "ttktt",
    6: "tt,ktt",
    7: "t,t,ktt",
    8: "t,t,k,tt",
    9: "t,t,k,t,ktt"
  } : {
    1: ",",
    2: "ta-ka",
    3: "ta-ki-ta",
    4: "ta-ka-dhi-mi",
    5: "ta-ka-ta-ki-ta",
    6: "ta-ki-ta-ta-ki-ta",
    7: "ta-ka-dhi-mi-ta-ki-ta",
    8: "ta-ka-dhi-mi-ta-ka-dhi-mi",
    9: "ta-ka-dhi-mi-ta-ka-ta-ki-ta"
  };
  
  var val = activeDict[count];
  var resultStr = "";
  if (val) {
    resultStr = val;
  } else {
    // For counts larger than 9, dynamically assemble using fillMatras
    var syls = fillMatras(count, 0);
    if (style === "classical") {
      resultStr = translateToNotation(syls);
    } else {
      resultStr = syls.replace(/\s+/g, "-");
    }
  }
  
  if (style === "classical") {
    return formatClassicalNotation(resultStr);
  }
  return resultStr
    .replace(/,/g, " , ")
    .replace(/;/g, " ; ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Expands a full Korvai numeric structure into full Solkattu notation.
 * 
 * @param {number} p Phrase length (A)
 * @param {number} c Connector length (B)
 * @param {string} style Optional. 'phonetic' (default) or 'classical'.
 * @return {string} Expanded A B A B A solkattu structure.
 * @customfunction
 */
function KORVAI(p, c, style) {
  if (!p || isNaN(p)) return "";
  c = c || 0;
  
  var phrase = SOLKATTU(p, style);
  var connector = c > 0 ? SOLKATTU(c, style) : "";
  
  var parts = [phrase, connector, phrase, connector, phrase];
  var rawKorvai = parts.filter(Boolean).join(" | ");
  
  if (style === "classical") {
    return formatClassicalNotation(rawKorvai);
  }
  return rawKorvai
    .replace(/,/g, " , ")
    .replace(/;/g, " ; ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Translates classical notation (e.g. "tt,ktt" or "t,k,d,") back to phonetic Solkattu/Konnakol.
 * 
 * @param {string} notation The classical notation string.
 * @return {string} Phonetic solkattu syllables separated by spaces.
 * @customfunction
 */
function NOTATION_TO_SOLKATTU(notation) {
  if (!notation) return "";
  
  // Clean up input
  var clean = notation.toString().trim();
  
  // If it already has phonetic words, return it with normalized spacing for commas and semicolons
  var lower = clean.toLowerCase();
  var phoneticWords = ["ta", "ka", "dhi", "mi", "taam", "dheem", "naam", "nam", "gin", "ki", "ti", "na", "din", "tin"];
  for (var w = 0; w < phoneticWords.length; w++) {
    var regex = new RegExp("\\b" + phoneticWords[w] + "\\b");
    if (regex.test(lower)) {
      return clean
        .replace(/-/g, " ")
        .replace(/,/g, " , ")
        .replace(/;/g, " ; ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  
  var result = [];
  var i = 0;
  
  // Direct back-mapping dictionary
  var reverseMap = {
    "t": "ta", "k": "ka", "d": "dhi", "m": "mi", "g": "gin",
    "n": "nam", "r": "ri", "l": "la", "j": "jham", "c": "cha",
    ",": ",", ";": ";", " ": " "
  };
  
  // Map long syllables (letter followed by comma)
  var longMap = {
    "t": "taam", "k": "kaam", "d": "dheem", "m": "meem", "g": "geem",
    "n": "naam", "r": "reem", "l": "laam", "j": "jheem", "c": "chaam"
  };
  
  while (i < clean.length) {
    var char = clean[i].toLowerCase();
    
    if (i + 1 < clean.length && clean[i + 1] === "," && longMap[char]) {
      result.push(longMap[char]);
      i += 2; // skip both letter and comma
    } else if (char === ";") {
      result.push(";");
      i++;
    } else if (char === ",") {
      result.push(",");
      i++;
    } else if (reverseMap[char]) {
      result.push(reverseMap[char]);
      i++;
    } else {
      // Just keep other characters as is (e.g. whitespace, bars, etc.)
      result.push(clean[i]);
      i++;
    }
  }
  
  var rawOutput = result.join(" ");
  return rawOutput
    .replace(/,/g, " , ")
    .replace(/;/g, " ; ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Reads the active row's Korvai data (A and B notation, sizes) to sync with the sidebar.
 * 
 * @return {string} JSON-serialized row details.
 */
function readSelectedRow() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var activeCell = sheet.getActiveCell();
  var row = activeCell.getRow();
  
  // Read sizes (Cols A and B)
  var pSize = sheet.getRange(row, 1).getValue(); // Col A
  var cSize = sheet.getRange(row, 2).getValue(); // Col B
  
  // Read notations (Cols L and M)
  var pNotation = sheet.getRange(row, 12).getValue(); // Col L (Phrase A)
  var cNotation = sheet.getRange(row, 13).getValue(); // Col M (Connector B)
  
  // Default fallback if cells are empty or not formatted
  pNotation = pNotation || "";
  cNotation = cNotation || "";
  
  pSize = parseInt(pSize) || 0;
  cSize = parseInt(cSize) || 0;
  
  // Convert notations to syllables
  var pSyllables = NOTATION_TO_SOLKATTU(pNotation);
  var cSyllables = NOTATION_TO_SOLKATTU(cNotation);
  
  return JSON.stringify({
    row: row,
    p: pSize,
    c: cSize,
    phraseNotation: pNotation,
    connectorNotation: cNotation,
    phrase: pSyllables,
    connector: cSyllables
  });
}


