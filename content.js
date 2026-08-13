let currentTitle = "";
let currentDifficulty = "Unknown";

function updateProblem() {
    const problemTitle = document.querySelector("div.text-title-large a");

    if (problemTitle) {
    currentTitle = problemTitle.textContent.trim();
} else {
    currentTitle = document.title
        .replace(" - LeetCode", "")
        .trim();
}
    const difficulty = document.querySelector('[class*="text-difficulty"]');

    if (difficulty) {
        currentDifficulty = difficulty.textContent.trim();
    }
}

// Keep checking while LeetCode is loading/changing
setInterval(() => {
    updateProblem();
}, 500);

updateProblem();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "getProblem") {

        updateProblem();

        sendResponse({
            title: currentTitle,
            difficulty: currentDifficulty
        });
    }
});