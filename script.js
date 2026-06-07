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
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
];

// ====================================
// LOAD DICTIONARY
// ====================================

async function loadDictionary() {

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

    } catch (error) {

        console.error(
            'Dictionary load failed:',
            error
        );
    }
}

// ====================================
// BOARD
// ====================================

function getBoard() {

    const inputs =
        document.querySelectorAll(
            '#letterGrid input'
        );

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

    const inputs =
        document.querySelectorAll(
            '#letterGrid input'
        );

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

        points.push(
            `${x},${y}`
        );
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

    polyline.setAttribute(
        'fill',
        'none'
    );

    polyline.setAttribute(
        'stroke',
        'rgba(255,0,0,0.55)'
    );

    polyline.setAttribute(
        'stroke-width',
        '12'
    );

    polyline.setAttribute(
        'stroke-linecap',
        'round'
    );

    polyline.setAttribute(
        'stroke-linejoin',
        'round'
    );

    svg.appendChild(
        polyline
    );
}

// ====================================
// HIGHLIGHT WORD PATH
// ====================================

function highlightPath(path) {

    clearHighlights();

    const inputs =
        document.querySelectorAll(
            '#letterGrid input'
        );

    path.forEach(
        ([row, col], index) => {

            const tileIndex =
                row * GRID_SIZE + col;

            if (index === 0) {

                inputs[tileIndex]
                    .classList.add(
                        'start-highlight'
                    );

            } else {

                inputs[tileIndex]
                    .classList.add(
                        'highlight'
                    );
            }
        }
    );

    drawPath(path);
}

// ====================================
// SOLVER
// ====================================

function solveBoard(board) {

    const foundWords =
        new Map();

    function dfs(
        row,
        col,
        currentWord,
        visited,
        path
    ) {

        currentWord +=
            board[row][col];

        if (
            !prefixes.has(
                currentWord
            )
        ) {
            return;
        }

        const currentPath =
            [
                ...path,
                [row, col]
            ];

        if (
            dictionary.has(
                currentWord
            )
        ) {

            if (
                !foundWords.has(
                    currentWord
                )
            ) {

                foundWords.set(
                    currentWord,
                    currentPath
                );
            }
        }

        visited[row][col] =
            true;

        for (
            const [dr, dc]
            of directions
        ) {

            const newRow =
                row + dr;

            const newCol =
                col + dc;

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

        visited[row][col] =
            false;
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
                        Array(
                            GRID_SIZE
                        ).fill(false)
                    );

            dfs(
                row,
                col,
                '',
                visited,
                []
            );
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

            const wordA =
                a[0];

            const wordB =
                b[0];

            if (
                wordB.length !==
                wordA.length
            ) {

                return (
                    wordB.length -
                    wordA.length
                );
            }

            return wordA.localeCompare(
                wordB
            );
        });
}

// ====================================
// DISPLAY RESULTS
// ====================================

function displayResults(
    sortedResults
) {

    const resultsDiv =
        document.getElementById(
            'results'
        );

    if (
        sortedResults.length === 0
    ) {

        resultsDiv.innerHTML =
            `
            <p>
                No words found.
            </p>
            `;

        return;
    }

    let html = `
        <h2>
            ${sortedResults.length}
            Words Found
        </h2>

        <ul class="word-list">
    `;

    sortedResults.forEach(
        ([word]) => {

            html += `
                <li
                    class="word-item"
                    data-word="${word}"
                >
                    <span>
                        ${word}
                    </span>

                    <span>
                        ${word.length}
                    </span>
                </li>
            `;
        }
    );

    html += `
        </ul>
    `;

    resultsDiv.innerHTML =
        html;

    document
        .querySelectorAll(
            '.word-item'
        )
        .forEach(item => {

            item.addEventListener(
                'click',
                () => {

                    const word =
                        item.dataset.word;

                    const entry =
                        sortedResults.find(
                            result =>
                                result[0] === word
                        );

                    if (
                        entry
                    ) {

                        const path =
                            entry[1];

                        const index =
							sortedResults.findIndex(
								result =>
									result[0] === word
							);

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
        item.classList.remove(
            'selected-word'
        )
    );

    const selectedItem =
        items[index];

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
// SOLVE BUTTON
// ====================================

document
    .getElementById(
        'solveBtn'
    )
    .addEventListener(
        'click',
        () => {

            clearHighlights();

            const board =
                getBoard();

            const results =
                solveBoard(
                    board
                );

            const sorted =
                sortResults(
                    results
                );

            currentResults = sorted;
			currentWordIndex = -1;

			displayResults(sorted);
			if (sorted.length > 0) {
				selectWord(0);
			}
        }
    );

document
    .getElementById('nextBtn')
    .addEventListener(
        'click',
        () => {

            if (
                currentResults.length === 0
            ) {
                return;
            }

            currentWordIndex++;

            if (
                currentWordIndex >=
                currentResults.length
            ) {

                currentWordIndex = 0;
            }

            selectWord(
                currentWordIndex
            );
        }
    );

// ====================================
// INIT
// ====================================

loadDictionary();