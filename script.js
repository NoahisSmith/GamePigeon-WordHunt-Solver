// ====================================
// GLOBALS
// ====================================

let dictionary = new Set();
let prefixes = new Set();

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

        const response = await fetch('dictionary.txt');
        const text = await response.text();

        const words = text
            .split(/\r?\n/)
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length >= 3);

        words.forEach(word => {

            dictionary.add(word);

            for (let i = 1; i <= word.length; i++) {
                prefixes.add(word.substring(0, i));
            }
        });

        console.log(
            `Loaded ${dictionary.size} words`
        );

    } catch (error) {

        console.error(
            'Failed to load dictionary:',
            error
        );
    }
}

// ====================================
// BOARD FUNCTIONS
// ====================================

function getBoard() {

    const inputs =
        document.querySelectorAll(
            '#letterGrid input'
        );

    let board = [];

    for (let row = 0; row < GRID_SIZE; row++) {

        board[row] = [];

        for (let col = 0; col < GRID_SIZE; col++) {

            board[row][col] =
                inputs[
                    row * GRID_SIZE + col
                ]
                .value
                .toLowerCase()
                .trim();
        }
    }

    return board;
}

// ====================================
// CLEAR HIGHLIGHTS
// ====================================

function clearHighlights() {

    const inputs =
        document.querySelectorAll(
            '#letterGrid input'
        );

    inputs.forEach(input => {
        input.classList.remove(
            'highlight'
        );
    });
}

// ====================================
// HIGHLIGHT PATH
// ====================================

function highlightPath(path) {

    clearHighlights();

    const inputs =
        document.querySelectorAll(
            '#letterGrid input'
        );

    path.forEach(([row, col]) => {

        const index =
            row * GRID_SIZE + col;

        inputs[index]
            .classList.add(
                'highlight'
            );
    });
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
            [...path, [row, col]];

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
            '<p>No words found.</p>';

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
        ([word, path]) => {

            html += `
                <li
                    class="word-item"
                    data-word="${word}"
                >
                    ${word}
                    (${word.length})
                </li>
            `;
        }
    );

    html += '</ul>';

    resultsDiv.innerHTML =
        html;

    const items =
        document.querySelectorAll(
            '.word-item'
        );

    items.forEach(item => {

        item.addEventListener(
            'click',
            () => {

                const word =
                    item.dataset.word;

                const path =
                    sortedResults.find(
                        entry =>
                            entry[0] === word
                    )[1];

                highlightPath(
                    path
                );
            }
        );
    });
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

            displayResults(
                sorted
            );
        }
    );

// ====================================
// INIT
// ====================================

loadDictionary();