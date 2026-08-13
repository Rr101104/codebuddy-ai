// ---------- Thinking score pulse animation ----------
const pulseLine = document.getElementById('pulseLine');
const scoreValue = document.getElementById('scoreValue');
let currentScore = 64;
let t = 0;

function buildPoints(intensity){
  const points = [];
  const w = 300, h = 54, mid = 27;
  const segments = 60;
  for(let i = 0; i <= segments; i++){
    const x = (w / segments) * i;
    const noise = Math.sin((i + t) * 0.7) * 3 + Math.sin((i + t) * 0.21) * 2;
    const spike = (i % 11 === 0) ? (Math.random() * intensity) * (Math.random() > 0.5 ? 1 : -1) : 0;
    const y = mid + noise + spike;
    points.push(x + ',' + y);
  }
  return points.join(' ');
}

function animatePulse(){
  t += 0.5;
  const intensity = 6 + (currentScore / 100) * 14;
  pulseLine.setAttribute('points', buildPoints(intensity));
  requestAnimationFrame(animatePulse);
}
animatePulse();

function bumpScore(delta){
  currentScore = Math.max(0, Math.min(100, currentScore + delta));
  scoreValue.innerHTML = Math.round(currentScore) + '<span>/100</span>';
}

// ---------- Save button ----------
const saveBtn = document.getElementById('saveBtn');
const saveLabel = document.getElementById('saveLabel');
saveBtn.addEventListener("click", () => {

    const problem = document.getElementById("problemTitle").textContent.trim();

    if (problem === "Loading...") return;

    chrome.storage.local.get(["bookmarks"], (result) => {

        let bookmarks = result.bookmarks || [];

        // Remove old "Loading..." bookmark if it exists
        bookmarks = bookmarks.filter(p => p !== "Loading...");

        if (bookmarks.includes(problem)) {

            // Unbookmark
            bookmarks = bookmarks.filter(p => p !== problem);

            saveBtn.classList.remove("saved");
            saveLabel.textContent = "Bookmark";

        } else {

            // Bookmark
            bookmarks.push(problem);

            saveBtn.classList.add("saved");
            saveLabel.textContent = "Bookmarked";
        }

        chrome.storage.local.set({ bookmarks });

        loadBookmarks(); // Refresh the list immediately

    });

});

function loadBookmarks() {
    chrome.storage.local.get(["bookmarks"], (result) => {

        const bookmarkList = document.getElementById("bookmarkList");

        const bookmarks = result.bookmarks || [];

        if (bookmarks.length === 0) {
            bookmarkList.innerHTML = "No bookmarks yet.";
            return;
        }

        bookmarkList.innerHTML = bookmarks
            .map(problem => `<div>⭐ ${problem}</div>`)
            .join("");
    });
}
function updateBookmarkButton() {
    const problem = document.getElementById("problemTitle").textContent.trim();

    chrome.storage.local.get(["bookmarks"], (result) => {
        const bookmarks = result.bookmarks || [];

        if (bookmarks.includes(problem)) {
            saveLabel.textContent = "Bookmarked";
            saveBtn.classList.add("saved");
        } else {
            saveLabel.textContent = "Bookmark";
            saveBtn.classList.remove("saved");
        }
    });
}
const viewBookmarksBtn = document.getElementById("viewBookmarksBtn");
const bookmarkList = document.getElementById("bookmarkList");

viewBookmarksBtn.addEventListener("click", () => {

    const isHidden = getComputedStyle(bookmarkList).display === "none";

    if (isHidden) {
        bookmarkList.style.display = "block";
        loadBookmarks();
    } else {
        bookmarkList.style.display = "none";
    }
});
// ---------- AI response mock ----------
const responseBody = document.getElementById('responseBody');
const responseBadge = document.getElementById('responseBadge');
const stuckInput = document.getElementById('stuckInput');
const hintBtn = document.getElementById('hintBtn');
const explainBtn = document.getElementById('explainBtn');

function typeOut(html){
  responseBody.classList.remove('empty');
  responseBody.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
  responseBadge.textContent = 'thinking…';
  setTimeout(() => {
    responseBody.innerHTML = html;
    responseBadge.textContent = 'responded';
  }, 750);
}
const API_KEY = "";
async function getNextTopic(problemName) {

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${API_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `You are a DSA mentor.

The current problem is:
${problemName}

Suggest ONLY the next DSA topic the user should learn after this problem.

Reply with ONLY the topic name. For example:
Sliding Window
Binary Search
Graphs
Dynamic Programming

Do not explain anything.`
                            }
                        ]
                    }
                ]
            })
        }
    );

    const data = await response.json();
    console.log(data);

    if (!response.ok) {
        throw new Error(data.error?.message || "Request failed");
    }

    return data.candidates[0].content.parts[0].text.trim();
}
async function getHintFromGemini(userInput) {

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${API_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `You are CodeBuddy AI.

                                The user is currently solving this LeetCode problem:
                                ${document.getElementById("problemTitle").textContent}

                                The user says:
                                ${userInput}

                                Assume the user's message refers to the current LeetCode problem unless it is clearly unrelated.

                                Give ONE helpful hint.
                                Do not reveal the full solution.
                                Keep the hint short.`
                            }
                        ]
                    }
                ]
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
    console.error(data);
    throw new Error(data.error?.message || "Request failed");
}

    return data.candidates[0].content.parts[0].text;
}
async function getExplanationFromGemini(userInput) {
    const currentProblem = document.getElementById("problemTitle").textContent;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${API_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `You are CodeBuddy AI.

                                The user is currently solving this LeetCode problem:
                                ${currentProblem}

                                The user says:
                                ${userInput}

                                Assume the user's message refers to the current LeetCode problem unless it is clearly unrelated.

                                Explain the concept or approach in simple language.

                                Do not write code unless the user explicitly asks.

                                Keep the explanation under 150 words.`
                            }
                        ]
                    }
                ]
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error(data);
        throw new Error(data.error?.message || "Request failed");
    }

    return data.candidates[0].content.parts[0].text;
}
hintBtn.addEventListener("click", async () => {
    try {
        hintBtn.disabled = true;
        hintBtn.textContent = "Generating...";

        const userInput = stuckInput.value;

        const hint = await getHintFromGemini(userInput);

        typeOut(`<p>${hint}</p>`);

        bumpScore(4);

    } catch (error) {
        console.error(error);
        typeOut(`<p>⚠️ Failed to generate hint. Please try again.</p>`);

    } finally {
        hintBtn.disabled = false;
        hintBtn.textContent = "Get Hint";
    }
});
explainBtn.addEventListener("click", async () => {
    try {
        explainBtn.disabled = true;
        explainBtn.textContent = "Explaining...";

        const userInput = stuckInput.value;

        const explanation = await getExplanationFromGemini(userInput);

        typeOut(`<p>${explanation}</p>`);

        bumpScore(2);

    } catch (error) {
        console.error(error);
        typeOut(`<p>⚠️ Failed to explain the concept. Please try again.</p>`);

    } finally {
        explainBtn.disabled = false;
        explainBtn.textContent = "Explain Concept";
    }
});

stuckInput.addEventListener('input', () => {
  if(stuckInput.value.trim().length > 0 && responseBadge.textContent === 'idle'){
    responseBadge.textContent = 'ready';
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {

    function getProblem(retries = 10) {
        chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "getProblem" },
            (response) => {

                if (response && response.title) {
                    document.getElementById("problemTitle").textContent = response.title;

                    updateBookmarkButton();

                    const difficultyTag = document.querySelector(".tag");

                    difficultyTag.textContent = response.difficulty;
                    difficultyTag.className = "tag";

                    if (response.difficulty === "Easy") {
                        difficultyTag.classList.add("diff-easy");
                    } else if (response.difficulty === "Medium") {
                        difficultyTag.classList.add("diff-medium");
                    } else if (response.difficulty === "Hard") {
                        difficultyTag.classList.add("diff-hard");
                    }

                    return;
                }

                if (retries > 0) {
                    setTimeout(() => getProblem(retries - 1), 500);
                }
            }
        );
    }

    getProblem();
});