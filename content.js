console.log("DiscoDig running...")

const stopwords = new Set([
    "got", "after", "going", "theres", "ill", "yes", "thats", "i", "im", "i'm", "r", "ur", "u", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
    "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
    "her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
    "theirs", "themselves", "what", "which", "who", "whom", "this", "that",
    "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
    "the", "and", "but", "if", "or", "because", "as", "until", "while", "of",
    "at", "by", "for", "with", "about", "to", "from", "up", "down",
    "in", "out", "on", "off", "then", "here", "there", "when", "where",
    "why", "how", "all", "any", "both", "each", "should", "now",
    "few", "more", "most", "other", "some", "such", "no", "not", "only",
    "own", "same", "so", "than", "too", "very", "can", "will", "just"
]);


// get user token (remove before pushing to github)
const iframe = document.createElement("iframe")
iframe.style.display = "none"
const storage = document.body.appendChild(iframe).contentWindow.localStorage;
token = storage.token
token = token.slice(1, token.length - 1)
console.log("token obtained: ", token)



// create DD button
const DDbutton = document.createElement("button");
DDbutton.id = "discoDigButton";
DDbutton.width = 30;
DDbutton.height = 30;
DDbutton.textContent = "DD"
DDbutton.style.backgroundColor = "#adaeb4"
DDbutton.style.borderRadius = "6px"
DDbutton.onclick = openDD

// create DD modal
const discoDig = document.createElement("span");
discoDig.id = "discoDigModal";
const gifPath = chrome.runtime.getURL('imgs/buldozer.gif');

discoDig.innerHTML = `
<style>
.modebar{
      display: none !important;
}

#closeButton {
    float:right;
    border-radius: 100%;
    background-color: red;
    color: white;
    height: 30px;
    width: 30px;
}

#DDContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}

#DDDiv {
    background-color: rgba(54, 42, 191, 0.9);
    width: 80vw;
    height: 70vh;
    position: absolute;
    z-index: 1000;
    padding: 20px;
    border: 3px solid #ffffff;
    border-radius: 25px;
    overflow-y: scroll;
    

}

#title {
    text-align: center;
    color: white;
    font-size: 40px;
    font-weight: strong;
    margin-bottom: 20px;
}

#dataContainer {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

#userCounts, #userWordCounts, #wordCloud {
    margin: 10px;
    background-color: rgb(74, 61, 214);
    width: 30%;
    height: 400px;
    border-radius: 10px;
}


#wordCloudCanvas {
    width: 100%;
    height: 100%;
}
#selectedChannel {
    color: white;
    text-align: center;
}

#Buldozer {
    position: relative;
    overflow: hidden;
    height: 100px; /* Adjust to your gif height */
}

#Buldozer img {
    position: absolute;
    animation: moveBuldozer 10s linear infinite;
    height: 100%; /* Match container height */
    transform: scaleX(-1);
}

@keyframes moveBuldozer {
    0% {
        left: -200px; /* Adjust based on gif width */
    }
    100% {
        left: 100%;
    }
}

</style>

<div id="DDContainer">
  <div id="DDDiv">
    <button id="closeButton" class="clickable">X</button>
    <h2 id="title">DiscoDig</h2>
    <h3 id="selectedChannel"></h3>

    <div id="dataContainer">
        <div id="userCounts"></div>
        <div id="userWordCounts">
            <select id="userSelect" class="clickable"></select>
            <ol id="userTopWords"></ol>
        </div>
        <div id="wordCloud">
            <canvas id="wordCloudCanvas">
            </canvas>
        </div>
        <br>
        <div id="timeGraph">
        </div>
    
    </div>
    <br>
        <div id="Buldozer">
                <img src="${gifPath}" alt="bulldozer gif" />
        </div>
  </div>
</div>`
    ;



discoDig.style.display = "none"
document.body.appendChild(discoDig);
document.getElementById("closeButton").onclick = closeDD
document.getElementById("userSelect").onchange = fetchCommonWords
const userSelect = document.getElementById("userSelect")
const userTopWordsDisplay = document.getElementById("userTopWords")
const selectedChannelDisplay = document.getElementById("selectedChannel")
const wordCloudCanvas = document.getElementById("wordCloudCanvas")
const timeGraphDisplay = document.getElementById("timeGraph")



let mappedMessages = new Map();
let datedMessages = new Map();


// event listener for discord toolbar appearing
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        for (const node of mutation.addedNodes) {
            if (node.querySelector?.(".toolbar__9293f")) { // search for toolbar
                console.log("new DM opened");
                spawnButton()

                //   observer.disconnect(); // stop watching after it appears
            }
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});


// spawn button in toolbar
function spawnButton() {
    console.log("button spawning...")

    const toolbar = document.getElementsByClassName("toolbar__9293f")[0];
    toolbar.appendChild(DDbutton);
}


function snowflakeToDate(snowflake) {
    const discordEpoch = 1420070400000n;
    const timestamp = (BigInt(snowflake) >> 22n) + discordEpoch;
    return new Date(Number(timestamp));
}


// open modal
async function openDD() {
    console.log("DD opened!")

    discoDig.style.display = "block"
    const chatID = window.location.href.slice(33)
    let link;
    mappedMessages.clear()
    datedMessages.clear()


    // fetch + display name of channel
    let response = await fetch(`https://discord.com/api/v9/channels/${chatID}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "authorization": token
        }
    });

    channel = await response.json()
    selectedChannelDisplay.innerHTML = channel.name || `DMs w/ ${channel.recipients[0].username}`



    // get all messages
    let n = prompt("how many msgs?")

    for (let i = 0; i < Math.floor(n / 100); i++) {

        link = `https://discord.com/api/v9/channels/${chatID}/messages?${(i != 0) && `before=${lastID}`}&limit=100`

        let response = await fetch(link, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "authorization": token
            }
        });


        msgs = await response.json()

        msgs.forEach((msg) => {
            // map the senders of the msgs
            mappedMessages.set(
                msg.author.username,
                [...(mappedMessages.get(msg.author.username) || []), msg.content]
            );

            // map the dates of the msgs
            let date = snowflakeToDate(msg.id).toLocaleDateString();
            datedMessages.set(date, (datedMessages.get(date) + 1 || 1));
        })

        console.log(datedMessages)

        lastID = msgs[msgs.length - 1].id
        console.log((i + 1) * 100 + " loaded")
    }

    console.log(mappedMessages)


    calculateUserCounts()
    fetchWordCloud()
    fetchCommonWords()
    displayTimeGraph()
}


function displayTimeGraph() {
    let timeData = {
        x: [...datedMessages.keys()],
        y: [...datedMessages.values()],
        type: 'scatter'
    };


    Plotly.newPlot(timeGraphDisplay, [timeData]);

}

function fetchWordCloud() {
    // get a list of ALL words 
    // map them
    // convert it to a list
    let allWords = []

    mappedMessages.forEach((user) => {
        allWords = allWords.concat(user.join(" ").replace(/[!"’#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '').toLowerCase().split(" ").filter(word => word && !stopwords.has(word)));
    })

    console.log(allWords)


    // map them all
    let mappedWords = new Map();
    allWords.forEach((word) => {
        mappedWords.set(word, (mappedWords.get(word) + 1 || 1));
    })

    console.log(mappedWords)

    let wordCloudList = []
    mappedWords.forEach((freq, word) => {
        wordCloudList.push([word, freq])
    })

    console.log(wordCloudCanvas.offsetWidth)
    wordCloudCanvas.width = wordCloudCanvas.offsetWidth
    wordCloudCanvas.height = wordCloudCanvas.offsetHeight

    WordCloud(wordCloudCanvas, { list: wordCloudList, gridSize: 2, shape: "square", color: "random-light", backgroundColor: "rgb(74, 61, 214)", drawOutOfBound: false, hover: (item) => console.log(item) });
}



function calculateUserCounts() {
    // calculate user counts + populate userSelect
    let userCounts = []
    mappedMessages.forEach((msgs, user) => {
        userCounts.push(msgs.length)
        userSelect.innerHTML += ` <option value="${user}">${user}</option>`
    });


    // display user counts
    var data = [{
        type: "pie",
        values: userCounts,
        labels: [...mappedMessages.keys()], // .keys() returns an iterable - ... spreads it
        textinfo: "label+percent",
        textposition: "outside",
        automargin: true
    }]

    var layout = {
        height: 400,
        width: 400,
        paper_bgcolor: "rgba(0, 0, 0, 0)",
        margin: { "t": 0, "b": 0, "l": 0, "r": 0 },
        showlegend: false,
        font: {
            color: 'white'
        }
    }

    const userCountDisplay = document.getElementById('userCounts');
    Plotly.newPlot(userCountDisplay, data, layout)
}


function fetchCommonWords() {
    userTopWordsDisplay.innerHTML = ""

    // get array of words used by the user
    let selectedUser = userSelect.value
    userWords = mappedMessages.get(selectedUser).join(" ").replace(/[!"’#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '').toLowerCase().split(" ").filter(word => word && !stopwords.has(word));

    // map them all
    let mappedWords = new Map();
    userWords.forEach((word) => {
        mappedWords.set(word, (mappedWords.get(word) + 1 || 1));
    })


    // rank words
    let topWords = Array(10).fill().map(() => ({ word: "", freq: 0 })); // .fill() fills array with undefined

    mappedWords.forEach((freq, word) => {

        // find where the word fits into the topWords
        let i = 9
        while (freq > topWords[i].freq) {
            i--;
            if (i < 0) {
                break
            }
        }

        // check if while loop ran,
        // then insert the word
        if (i < 9) {
            topWords.splice(i + 1, 0, { word: word, freq: freq })
            topWords.pop()
        }

    });


    // display rankings
    topWords.forEach((wordObject, index) => {
        userTopWordsDisplay.innerHTML += ` <li>${index + 1}. ${wordObject.word} (${wordObject.freq})</li>`
    })
}



function closeDD() {
    discoDig.style.display = "none"
    userSelect.innerHTML = ""
    userTopWordsDisplay.innerHTML = ""
    console.log("DD closed")
}