# KorvaiSheets — Google Sheets Integration Guide

This workspace contains a native Google Sheets Extension that implements the Carnatic Korvai exact-fit formula ($3A + 2B = \text{Target}$) and generates solkattu syllables and notation directly inside your spreadsheets.

---

## What's Included

* [Code.gs](file:///Users/ragavan/Documents/antigravity/korvaisheets/Code.gs): The Apps Script backend that handles calculations, syllable blocks, and spreadsheet cell insertions.
* [Sidebar.html](file:///Users/ragavan/Documents/antigravity/korvaisheets/Sidebar.html): A high-fidelity sidebar GUI with dark glassmorphism styling to select presets, search splits, randomize phrases, and write data.

---

## Installation Steps (1-Minute Setup)

1. Open your Google Sheet: [Google Sheet URL](https://docs.google.com/spreadsheets/d/1mbWHuKyFbiepu8d9w2gsCDxM6CLsXfA7bw7BK8YbvQ8/edit?usp=sharing).
2. In the top menu, go to **Extensions** > **Apps Script**.
3. In the Apps Script editor, open the default `Code.gs` file and replace its entire contents with the code in [Code.gs](file:///Users/ragavan/Documents/antigravity/korvaisheets/Code.gs).
4. Click the **`+` (Add a file)** icon next to **Files** in the left sidebar, choose **HTML**, and name it exactly `Sidebar` (this will create `Sidebar.html`).
5. Open `Sidebar.html` and replace its entire contents with the HTML in [Sidebar.html](file:///Users/ragavan/Documents/antigravity/korvaisheets/Sidebar.html).
6. Click the **Save Project** (floppy disk) icon at the top of the editor.
7. Return to your Google Sheet and **reload the webpage**.

---

## How to Use

### 1. The Interactive Playground Sidebar
1. Select any cell in the row where you want to write a Korvai (usually the left-most cell, column A).
2. Go to **Korvai Tools** > **Open Playground Sidebar** in your sheet's menu bar.
3. Configure your target Tala cycle (e.g. *Adi, 2 cycles, 0 offset = 64 matras*).
4. Click **Find Valid Splits** to view all mathematically exact phrase/connector ($A$ & $B$) size combinations.
5. Click a split, then click **Generate Random Syllables** to randomize Carnatic solkattu.
6. Click **Insert Into Selected Row** to populate the sheet's columns automatically:
   - Sets numeric layout values (`p, c, p, c, p`) in columns A to E.
   - Computes total matra formulas in column H.
   - Places classical notation strokes (e.g., `tt,ktt`) and gap commas in columns L to P.

### 2. Custom Spreadsheet Formulas (UDFs)
You can use these custom functions directly inside cells like standard Excel/Google Sheets functions:
- `=SOLKATTU(count, style)`: Translates a matra count into syllables. Example: `=SOLKATTU(6, "phonetic")` returns `"ta-ki-ta-ta-ki-ta"`. Use `"classical"` style to get classical notation (e.g. `tt,ktt`).
- `=KORVAI(p, c, style)`: Expands a full Korvai numeric structure into an `A | B | A | B | A` solkattu string.
- `=NOTATION_TO_SOLKATTU(notation)`: Takes classical notation from a cell (like `tt,ktt`) and translates it back to spoken syllables (`"ta ta , ka ta ta"`).

### 3. Classical Notation Mapping Guide
Classical notation letters map to phonetic syllables as follows:

| Consonant Letter | Short Syllable (1 matra) | Long Syllable (2 matras - **Attached Comma**) |
| :--- | :--- | :--- |
| **t** | `ta` / `tha` / `ti` / `tin` | `t,` $\rightarrow$ `taam` / `thaam` |
| **d** | `dhi` / `din` / `de` | `d,` $\rightarrow$ `dheem` / `deem` |
| **k** | `ka` / `ki` / `ke` | `k,` $\rightarrow$ `kaam` |
| **n** | `nam` / `na` / `nu` | `n,` $\rightarrow$ `naam` |
| **g** | `gin` / `gi` / `gu` | `g,` $\rightarrow$ `geem` |
| **j** | `jham` / `jem` | `j,` $\rightarrow$ `jheem` / `jem` |
| **m** | `mi` | `m,` $\rightarrow$ `meem` |
| **c** | `cha` | `c,` $\rightarrow$ `chaam` |
| **r** | `ri` | `r,` $\rightarrow$ `reem` |
| **l** | `la` / `lan` | `l,` $\rightarrow$ `laam` |

#### Long Syllable vs. Short Syllable + Pause
* **Long Syllable (Open Ring)**: Written with the comma **immediately attached** (no spaces, e.g., `t,`). Plays as a single, sustained 2-matra resonant drum stroke (`taam`).
* **Short Syllable + Pause (Closed Damped)**: Written with a **space before the comma** (e.g., `t ,`). Plays as a short 1-matra closed stroke (`ta`) followed by 1 matra of silent gap (pause).

#### Pauses/Gaps
* `,` (isolated or space-padded) $\rightarrow$ 1-matra pause.
* `;` (isolated or space-padded) $\rightarrow$ 2-matra pause.

### 4. Active Row Sync & Audio Playback
1. Click any row in the spreadsheet that contains notation in columns L-P.
2. In the sidebar, click the green **Load Selection from Sheet** button.
3. This will automatically read the sizes and notation, generate the phonetic syllables, and display them.
4. Set the **Tempo (BPM)** and select your **Play Mode** (Mridangam Synth).
5. Click **Play Sound** to start/stop the playback.

### 5. Append Rhythmic Lesson Challenges
1. Click **Korvai Tools** > **Generate Rhythmic Challenge** in the menu bar, OR click **Append Challenge to Sheet** in the sidebar.
2. Enter the target Tala and matra count.
3. The script will automatically calculate a valid split, pick a random phrase length, and append a styled challenge block (with lavender header) at the bottom of the active sheet, prompting students to solve for the missing connector $B$ and write notation.
