// ====================================
// GLOBALS
// ====================================

let dictionary = new Set();
let prefixes = new Set();
let currentResults = [];
let currentWordIndex = -1;

const GRID_SIZE = 4;

const directions = [
    [-1, -1],
    [-1,  0],
    [-1,  1],
    [ 0, -1],
    [ 0,  1],
    [ 1, -1],
    [ 1,  0],
    [ 1,  1]
];

// Word Hunt point values by word length.
// NOTE: fetch('dictionary.txt') requires a web server —
// it will fail silently if opened directly via file://.

const WORD_SCORES = {
    3: 100,
    4: 400,
    5: 800,
    6: 1400,
    7: 1800
};

function getWordScore(length) {
    return WORD_SCORES[length] ?? 2200;
}

// ====================================
// INPUT AUTO-ADVANCE
// ====================================

const inputs =
    document.querySelectorAll(
        '#letterGrid input'
    );

inputs.forEach(
    (input, index) => {

        input.addEventListener(
            'input',
            e => {

                e.target.value =
                    e.target.value
                    .toUpperCase();

                if (
                    e.target.value &&
                    index < inputs.length - 1
                ) {
                    inputs[index + 1].focus();
                }
            }
        );

        input.addEventListener(
            'keydown',
            e => {

                if (
                    e.key === 'Backspace' &&
                    !input.value &&
                    index > 0
                ) {
                    inputs[index - 1].focus();
                }
            }
        );
    }
);

// ====================================
// LOAD DICTIONARY
// ====================================

async function loadDictionary() {

    const solveBtn =
        document.getElementById(
            'solveBtn'
        );

    try {

        const response =
            await fetch('dictionary.txt');

        const text =
            await response.text();

        const words =
            text
                .split(/\r?\n/)
                .map(word =>
                    word.trim().toLowerCase()
                )
                .filter(word =>
                    word.length >= 3
                );

        words.forEach(word => {

            dictionary.add(word);

            for (
                let i = 1;
                i <= word.length;
                i++
            ) {
                prefixes.add(
                    word.substring(0, i)
                );
            }
        });

        console.log(
            `Loaded ${dictionary.size} words`
        );

        solveBtn.disabled = false;
        solveBtn.textContent = 'Solve';

    } catch (error) {

        console.error(
            'Dictionary load failed:',
            error
        );

        solveBtn.textContent = 'Dict. Error';
        solveBtn.classList.add('btn-error');

        document.getElementById('results')
            .innerHTML = `
                <div class="error-msg">
                    ⚠️ Could not load
                    <code>dictionary.txt</code>.
                    Make sure the files are
                    served from a web server,
                    not opened via
                    <code>file://</code>.
                </div>
            `;
    }
}

// ====================================
// BOARD
// ====================================

function getBoard() {

    const board = [];

    for (
        let row = 0;
        row < GRID_SIZE;
        row++
    ) {

        board[row] = [];

        for (
            let col = 0;
            col < GRID_SIZE;
            col++
        ) {

            board[row][col] =
                inputs[
                    row * GRID_SIZE + col
                ]
                .value
                .trim()
                .toLowerCase();
        }
    }

    return board;
}

// ====================================
// VALIDATE BOARD
// ====================================

function validateBoard(board) {

    return board
        .flat()
        .every(
            cell =>
                cell.length === 1 &&
                /[a-z]/.test(cell)
        );
}

// ====================================
// CLEAR BOARD HIGHLIGHTS
// ====================================

function clearHighlights() {

    document
        .querySelectorAll('#letterGrid input')
        .forEach(tile => {

            tile.classList.remove(
                'highlight',
                'start-highlight'
            );
        });

    const svg =
        document.getElementById(
            'pathOverlay'
        );

    if (svg) {
        svg.innerHTML = '';
    }
}

// ====================================
// DRAW SVG PATH
// ====================================

function drawPath(path) {

    const svg =
        document.getElementById(
            'pathOverlay'
        );

    if (!svg) return;

    svg.innerHTML = '';

    const board =
        document.getElementById(
            'letterGrid'
        );

    const boardRect =
        board.getBoundingClientRect();

    const points = [];

    path.forEach(([row, col]) => {

        const index =
            row * GRID_SIZE + col;

        const tile =
            inputs[index];

        const rect =
            tile.getBoundingClientRect();

        const x =
            rect.left -
            boardRect.left +
            rect.width / 2;

        const y =
            rect.top -
            boardRect.top +
            rect.height / 2;

        points.push(`${x},${y}`);
    });

    const polyline =
        document.createElementNS(
            'http://www.w3.org/2000/svg',
            'polyline'
        );

    polyline.setAttribute(
        'points',
        points.join(' ')
    );

    polyline.setAttribute('fill',         'none');
    polyline.setAttribute('stroke',       'rgba(255,0,0,0.55)');
    polyline.setAttribute('stroke-width', '12');
    polyline.setAttribute('stroke-linecap',  'round');
    polyline.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(polyline);
}

// ====================================
// HIGHLIGHT WORD PATH
// ====================================

function highlightPath(path) {

    clearHighlights();

    path.forEach(
        ([row, col], index) => {

            const tileIndex =
                row * GRID_SIZE + col;

            inputs[tileIndex].classList.add(
                index === 0
                    ? 'start-highlight'
                    : 'highlight'
            );
        }
    );

    drawPath(path);
}

// ====================================
// SOLVER
// ====================================

function solveBoard(board) {

    const foundWords = new Map();

    function dfs(
        row,
        col,
        currentWord,
        visited,
        path
    ) {

        currentWord += board[row][col];

        if (!prefixes.has(currentWord)) {
            return;
        }

        const currentPath =
            [...path, [row, col]];

        if (
            dictionary.has(currentWord) &&
            !foundWords.has(currentWord)
        ) {
            foundWords.set(
                currentWord,
                currentPath
            );
        }

        visited[row][col] = true;

        for (const [dr, dc] of directions) {

            const newRow = row + dr;
            const newCol = col + dc;

            const validMove =
                newRow >= 0 &&
                newRow < GRID_SIZE &&
                newCol >= 0 &&
                newCol < GRID_SIZE;

            if (
                validMove &&
                !visited[newRow][newCol]
            ) {
                dfs(
                    newRow,
                    newCol,
                    currentWord,
                    visited,
                    currentPath
                );
            }
        }

        visited[row][col] = false;
    }

    for (
        let row = 0;
        row < GRID_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < GRID_SIZE;
            col++
        ) {

            const visited =
                Array(GRID_SIZE)
                    .fill()
                    .map(() =>
                        Array(GRID_SIZE).fill(false)
                    );

            dfs(row, col, '', visited, []);
        }
    }

    return foundWords;
}

// ====================================
// SORT RESULTS
// ====================================

function sortResults(wordMap) {

    return [...wordMap.entries()]
        .sort((a, b) => {

            const lenDiff =
                b[0].length - a[0].length;

            if (lenDiff !== 0) return lenDiff;

            return a[0].localeCompare(b[0]);
        });
}

// ====================================
// DISPLAY RESULTS
// ====================================

function displayResults(sortedResults) {

    const resultsDiv =
        document.getElementById('results');

    const totalScore =
        sortedResults.reduce(
            (sum, [word]) =>
                sum + getWordScore(word.length),
            0
        );

    document
        .getElementById('wordCount')
        .textContent = sortedResults.length;

    document
        .getElementById('maxScore')
        .textContent = totalScore.toLocaleString();

    if (sortedResults.length === 0) {

        resultsDiv.innerHTML =
            `<p>No words found.</p>`;

        return;
    }

    let html = `<ul class="word-list">`;

    sortedResults.forEach(([word]) => {

        const score =
            getWordScore(word.length);

        html += `
            <li
                class="word-item"
                data-word="${word}"
            >
                <span class="word-text">
                    ${word}
                </span>

                <span class="word-meta">
                    <span class="word-score">
                        ${score} pts
                    </span>
                    <span class="word-length">
                        ${word.length}
                    </span>
                </span>
            </li>
        `;
    });

    html += `</ul>`;

    resultsDiv.innerHTML = html;

    document
        .querySelectorAll('.word-item')
        .forEach(item => {

            item.addEventListener(
                'click',
                () => {

                    const word =
                        item.dataset.word;

                    const index =
                        sortedResults.findIndex(
                            result =>
                                result[0] === word
                        );

                    if (index !== -1) {
                        selectWord(index);
                    }
                }
            );
        });
}

// ====================================
// SELECT WORD
// ====================================

function selectWord(index) {

    if (
        index < 0 ||
        index >= currentResults.length
    ) {
        return;
    }

    currentWordIndex = index;

    const items =
        document.querySelectorAll(
            '.word-item'
        );

    items.forEach(item =>
        item.classList.remove('selected-word')
    );

    const selectedItem = items[index];

    if (selectedItem) {

        selectedItem.classList.add(
            'selected-word'
        );

        selectedItem.scrollIntoView({
            block: 'nearest'
        });
    }

    const path =
        currentResults[index][1];

    highlightPath(path);
}

// ====================================
// CLEAR BUTTON
// ====================================

document
    .getElementById('clearBtn')
    .addEventListener('click', () => {

        inputs.forEach(input => {
            input.value = '';
        });

        clearHighlights();

        currentResults = [];
        currentWordIndex = -1;

        document
            .getElementById('wordCount')
            .textContent = '0';

        document
            .getElementById('maxScore')
            .textContent = '0';

        document
            .getElementById('results')
            .innerHTML = `
                <div class="placeholder">
                    Enter letters and click Solve.
                </div>
            `;

        inputs[0].focus();
    });

// ====================================
// SOLVE BUTTON
// ====================================

document
    .getElementById('solveBtn')
    .addEventListener('click', () => {

        clearHighlights();

        const board = getBoard();

        if (!validateBoard(board)) {

            document
                .getElementById('results')
                .innerHTML = `
                    <div class="error-msg">
                        ⚠️ Please fill in all
                        16 tiles before solving.
                    </div>
                `;

            return;
        }

        const results = solveBoard(board);
        const sorted  = sortResults(results);

        currentResults   = sorted;
        currentWordIndex = -1;

        displayResults(sorted);

        if (sorted.length > 0) {
            selectWord(0);
        }
    });

// ====================================
// NEXT BUTTON
// ====================================

document
    .getElementById('nextBtn')
    .addEventListener('click', () => {

        if (currentResults.length === 0) {
            return;
        }

        currentWordIndex =
            (currentWordIndex + 1) %
            currentResults.length;

        selectWord(currentWordIndex);
    });

// ====================================
// ENTER KEY SHORTCUT
// ====================================

document.addEventListener(
    'keydown',
    e => {

        const solveBtn =
            document.getElementById(
                'solveBtn'
            );

        if (
            e.key === 'Enter' &&
            !solveBtn.disabled
        ) {
            solveBtn.click();
        }
    }
);

// ====================================
// INIT
// ====================================

loadDictionary();
