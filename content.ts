// these lines only import the TYPES for these libraries
// this way, the .js file won't re-import the libraries 
// which will break the code since it's running in chrome, not node

declare const Plotly: typeof PlotlyType;
import type PlotlyType from 'plotly.js';

declare const WordCloud: typeof WordCloudType;
import type WordCloudType from 'wordcloud';
import type { ListEntry } from 'wordcloud';


// stopwords to use for top 10 words + wordcloud
const stopwords = new Set([
    "abt", "bc", "yeah", "dont", "think", "also", "get", "got",
    "after", "going", "theres", "ill", "yes", "thats", "i",
    "im", "i'm", "r", "ur", "u", "me", "my", "myself", "we", "our", "ours",
    "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him",
    "her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
    "theirs", "themselves", "what", "which", "who", "whom", "this", "that",
    "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
    "the", "and", "but", "if", "or", "because", "as", "until", "while", "of",
    "at", "by", "for", "with", "about", "to", "from", "up", "down",
    "in", "out", "on", "off", "then", "here", "there", "when", "where",
    "why", "how", "all", "any", "both", "each", "should", "now",
    "few", "more", "most", "other", "some", "such", "no", "not", "only",
    "own", "same", "so", "than", "too", "very", "can", "will", "just",
    "his", "himself", "she",
]);


/** variable type for each user's data */
interface userData {
    /** the user's username */
    username: string,
    /** the key to the link of the user's pfp */
    avatarID: string,
    /** an array of every msg the user has sent */
    allMessages: string[],
    /** top 10 used words by user */
    mostUsedWords: { word: string, freq: number }[],
    /** top 10 used emojis by user */
    mostUsedEmojis: { emoji: string, freq: number }[],
    /** average # of characters in user's msgs */
    avgMsgLength: number,
    /** number of msgs sent */
    numberOfMessages: number,
    /** avg reply time */
    avgReplyTime: number[],
    /** the user they ping the most */
    mostPinged: { user: string, freq: number },
    /** number of times they have been pinged */
    timesPinged: number,
}

// maps & arrays
const mappedMessages: Map<string, userData> = new Map();  // user: their data
const datedMessages = new Map();                          // date: number of msgs
const timedMessages: Map<number, number> = new Map([      // time: number of msgs
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
    [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
    [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],
    [20, 0], [21, 0], [22, 0], [23, 0]
]);
const gifFrequency: Map<string, number> = new Map();      // gif link: # of times used
let topGifs = [{ gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }]

// chat information
let chatID: bigint;
let channel: {
    name: string;
    recipients: { username: string }[]
};

const publicKey = document.body.appendChild(Object.assign(document.createElement("iframe"), { style: "display:none;" })).contentWindow!.localStorage.token.replace(/"/g, '');



/** number of msgs the user wants discodig to dig through */
let n: number;




// wait (used for waiting in api calls)
function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/** get date of msgs from their snowflake */
function snowflakeToDate(snowflake: number): Date {
    const discordEpoch = 1420070400000n;
    const timestamp = (BigInt(snowflake) >> 22n) + discordEpoch;
    return new Date(Number(timestamp));
}




// create shovel button
const DDbutton = document.createElement("img");
const shovelImg = chrome.runtime.getURL('assets/imgs/shovel.png');
const activeShovelImg = chrome.runtime.getURL('assets/imgs/shovelActive.png');
DDbutton.id = "discoDigButton";
DDbutton.src = shovelImg
DDbutton.width = 25;
DDbutton.height = 25;
DDbutton.onclick = toggleDD
DDbutton.style.cursor = "pointer"


// create DD modal
const discoDig = document.createElement("span");
discoDig.id = "discoDigModal";
const bulldozerGif = chrome.runtime.getURL('assets/imgs/bulldozer.gif');
const discordFont = chrome.runtime.getURL('assets/fonts/discordFont.ttf');

discoDig.innerHTML = `
<style>
@font-face {
    font-family: 'discordFont';
    src: url('${discordFont}') format('truetype');
}


.modebar{
    display: none !important;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

::-webkit-scrollbar-thumb {
  background-color: #F1FFE7;
  border: 4px solid transparent;
  border-radius: 8px;
  background-clip: padding-box;  
}

::-webkit-scrollbar {
  width: 16px;
}

#closeButton {
    float:right;
    border-radius: 100%;
    background-color: red;
    color: #F1FFE7;
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
    padding: 15px;
    border: 3px solid #ffffff;
    border-radius: 15px;
    overflow-y: scroll;
}

#selectedChannel {
    text-align: center;
    color: #F1FFE7;
    font-size: 40px;
    font-weight: strong;
    margin-bottom: 20px;
    margin-top: 15px;
}

#title {
    color: #89DAFF;
    text-align: center;
    font-family: discordFont;
}

.logoText {
    color: #89DAFF;
    font-family: discordFont;
    margin-right: 5px;
}

#promptBox {
    padding: 19px;
    margin: auto;
    display: flex;
    width: 70%;
    max-width: 500px; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
    background-color: #4337cdff; 
    border-radius: 20px;
}

#prompt {
    text-align: center;
    font-size: 30px;
    color: #CB9CF2;
}

#inputLabel {
    font-size: 23px;
    display: inline-block;
    color: #F1FFE7;
}

#nInput {
    display: inline-block; 
    background-color: rgba(0,0,0,0); 
    border: none; 
    border-bottom: 2px #F1FFE7 solid; 
    text-align: right;
    width: 100px; 
    font-size: 23px;
    color: #F1FFE7;
}

#digBtn {
    display: block;
    background-color: #44CF6C;
    font-size: 20px;
    border-radius: 10px;
    width: 100px;
}

#digBtn:hover {
    background-color: #26a94bff;
}

#loadingScreen {
    display: none
}

#loadingScreen #progressDisplay {
    color: #F1FFE7;
    text-align: center;
    font-size: 19px;
}

#loadingContainer {
    height: 24px;
    width: 80%;
    border: 1px grey solid;
    background-color: rgba(0, 0, 0, 0);
    border-radius: 20px;
    z-index: 1000;
    margin: auto;
}

#loadingBar {
    height: 24px;
    width: 0%;
    background-color: #CB9CF2;
    border-radius: 20px 0px 0px 20px;
}
 
#loadingScreen p {
    color: #F1FFE7;
    text-align: center;
    font-size: 13px;
    font-style: italic;
}


#dataScreen {
  display: none;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}


#pieChartContainer, #wordCloud {
    margin: 5px;
    background-color: rgb(74, 61, 214);
    height: 400px;
    border-radius: 10px;
    overflow: hidden;
}

#userProfile {
    margin: 5px;
    background-color: rgb(74, 61, 214);
    min-height: 400px;
    border-radius: 10px;
    overflow: visible;
}

#pieChartContainer {
    width: 36%;
}

#wordCloud {
    width: 54%;
}

#wordCloudTooltip, #gifTooltip {
    position: absolute;
    background-color: rgba(68, 207, 108, 0.9);
    color: black;
    padding: 5px;
    borderRadius: 3px;
    z-index: 1001;
    display: none;
}

.subheading {
    color: #F1FFE7;
    text-align: center;
    font-size: 25px;
    margin: 14px;
}

#pieChart {
    height: 340px;
}


#dayGraph, #timeGraph {
    width: 45%;
}

#wordCloudCanvas {
    width: 100%;
    height: 100%;
    border-radius: 10px;
}


#userProfile {
    width: 95%;
    max-width: 750px;
}

#userProfileHead {
    display: flex;
    justify-content: center;
    margin-top: 10px;
}

#userSelect {
    margin-right: 15px;
    background-color:rgb(74, 61, 214);
    color: #F1FFE7;
    text-align: right;
    font-size: 25px;
    border: none;
}

#userSelect option {
  background-color: #CB9CF2; 
  color: #FFFFFF; 
  font-size: 20px;
}


#userProfilePic {
    display: block;
    border-radius: 100%;
    width: 50px;
}

#userProfileBody {
    display: flex;
    justify-content: center;
    align-items: flex-start;
}

#userProfileBody #topTenWords,
#userProfileBody #topTenEmojis {
    width: 30%;
}

#userProfileBody #topTenWords {
    padding-bottom: 20px;
}

#userProfileBody #userGeneralStats {
    width: 40%
}

#userProfile p, #userProfile ol {
    text-align: center;
    color: #F1FFE7;
    font-size: 27px;
    margin-top: 14px;
}

#userProfile ol li {
    margin-top: 3px;
}


#gifGallery {
  background-color: rgb(74, 61, 214);
  width: 95%;
  margin: auto;
  padding-bottom: 4px;
}


#gifGallery .row {
  display: flex;
  flex-wrap: wrap;
  padding: 4px 4px;
}

#column-1, #column-2, #column-3  {
  flex: 30%;
  padding: 0 4px;
  height: auto;
}

#gifGallery img {
  margin-top: 8px;
  vertical-align: middle;
  width: 100%;
}

#bulldozer {
    position: relative;
    overflow: hidden;
    height: 100px; /* Adjust to your gif height */
    width: 100%;
}

#bulldozer img {
    position: absolute;
    animation: moveBuldozer 10s linear infinite;
    height: 100%;
}

@keyframes moveBuldozer {
    0% {
        left: -200px;
        transform: scaleX(-1);
    }

    50% {
        left: 100%;
        transform: scaleX(-1);
    }
    51% {
        transform: scaleX(1);
    }

    99% {
        transform: scaleX(1);
    }
    100% {
        left: -200px;
        transform: scaleX(-1);
    }
}

#credits {
    color: #F1FFE7;
}
</style>


<div id="wordCloudTooltip"></div>
<div id="gifTooltip"></div>

<div id="DDContainer">
  <div id="DDDiv">
    <h2 id="selectedChannel"></h2>
    <h3 id="title">DiscoDig</h3>

    <br>

    <div id="splashScreen">
        <br><br><br><br><br>
        <div id="promptBox">
            <p id="prompt"> How deep should we dig? </p>
            <div>
                <span style="color: rgba(0,0,0,0); font-size: 15px"> (messages)</span>
                <input type="text" id="nInput"> </input>
                <p id="inputLabel">
                    m <span style="font-size: 12px"> (messages)</span>
                </p>
            </div>
            <br>
            <button id="digBtn"> Dig! </button>
        </div>
    </div>

    <div id="loadingScreen">
        <br><br><br><br>
        <p id="progressDisplay"></p>
        <div id="loadingContainer">
            <div id="loadingBar"></div>
        </div>

        <p>keep this popup open and watch <span class="logoText">DiscoDig</span> dig away!</p>

        <br><br><br><br>

        <div id="bulldozer">
            <img src="${bulldozerGif}" />
        </div>
    </div>

    <div id="dataScreen">
        <div id="pieChartContainer">
            <h3 class="subheading">Share of Messages</h3>
            <div id="pieChart"></div>
        </div>

        <div id="wordCloud">
            <canvas id="wordCloudCanvas">
            </canvas>
        </div>

        <div id="userProfile">
            <div id="userProfileHead">
                <select id="userSelect"></select>
                <img id="userProfilePic" src="">
            </div>

            <br>

            <div id="userProfileBody">
                <div id="topTenWords">
                    <h4 class="subheading" style="font-size: 20px">Top Words</h4>
                    <ol id="userTopWords"></ol>
                </div>

                <div id="topTenEmojis">
                    <h4 class="subheading" style="font-size: 20px">Top Emojis</h4>
                    <ol id="userTopEmojis"></ol>
                </div>

                <div id="userGeneralStats">
                    <p id="userAvgLength"></p>
                    <p id="userAvgReplyTime"></p>
                    <p id="userMostPinged"></p>
                    <p id="timesPinged"></p>
                    <p style="color: rgba(0,0,0,0)">.</p>
                </div>
            </div>
        </div>

        <div id="dayGraph">
        </div>

        <div id="timeGraph">
        </div>

        <div id="gifGallery">
            <br>
            <h3 class="subheading" style="font-size: 30px"> Most Used Gifs </h3>
            <div class="row">
                <div id="column-1"></div>
                <div id="column-2"></div>
                <div id="column-3"></div>
            </div>
        </div>

        <div id="bulldozer">
            <img src="${bulldozerGif}" />
        </div>

        <p id="credits"><span class="logoText">DiscoDig</span> by <a href="https://vidsterbroyo.com/">vidu widyalankara</a> & <a href="https://www.linkedin.com/in/kai-bar-on/">kai bar-on</a></p>
    </div>

    <br>


  </div>
</div>`
    ;

discoDig.style.display = "none"
document.body.appendChild(discoDig);
document.getElementById("digBtn")!.onclick = dig


// DDModal handles
const splashScreen = document.getElementById("splashScreen")!
const nInput: HTMLInputElement = document.getElementById("nInput")! as HTMLInputElement
const loadingScreen = document.getElementById("loadingScreen")!
const progressStatus = document.getElementById("progressDisplay")!
const loadingBar = document.getElementById("loadingBar")!
const dataScreen = document.getElementById("dataScreen")!
const userSelect: HTMLInputElement = document.getElementById("userSelect")! as HTMLInputElement
userSelect.onchange = displayUserProfile
const userProfilePic = document.getElementById("userProfilePic")! as HTMLImageElement
const userTopWordsDisplay = document.getElementById("userTopWords")!
const userAvgLengthDisplay = document.getElementById("userAvgLength")!
const userAvgReplyTimeDisplay = document.getElementById("userAvgReplyTime")!
const userMostPinged = document.getElementById("userMostPinged")!
const timesPingedDisplay = document.getElementById("timesPinged")!
const selectedChannelDisplay = document.getElementById("selectedChannel")!
const wordCloudCanvas: HTMLCanvasElement = document.getElementById("wordCloudCanvas")! as HTMLCanvasElement
const WCTooltip = document.getElementById('wordCloudTooltip')!
wordCloudCanvas.onmouseleave = hideWordCloudTooltip
const dayGraphDisplay = document.getElementById("dayGraph")!
const timeGraphDisplay = document.getElementById("timeGraph")!
const gifTooltip = document.getElementById('gifTooltip')!


// event handler for nInput - mainly so i can add commas
nInput.addEventListener("keydown", (event) => {
    event.preventDefault();

    // keybind enter --> dig button
    if (event.key === "Enter") {
        dig();
        return;
    }

    // get clean input
    let input = nInput.value.replace(/\D/g, '');

    // backspace = delete last character
    if (event.key === "Backspace") {
        input = input.slice(0, -1);
    }

    // number = add it to input
    else if (!isNaN(parseInt(event.key))) {
        input += event.key;
    }

    // anything else 
    else {
        return;
    }

    // set nInput to clean number or empty string
    nInput.value = input ? parseInt(input).toLocaleString() : "";
});




/** show word frequency in wordcloud */
function showWordCloudTooltip(item: ListEntry, dimension: { x: number, y: number, w: number, h: number }) {
    if (!item) { hideWordCloudTooltip(); return }

    const canvasDimension: DOMRect = wordCloudCanvas.getBoundingClientRect();

    // set tooltip content and position
    WCTooltip.innerHTML = `${item[0]}: ${item[1]}`;
    WCTooltip.style.left = (canvasDimension.x + dimension.x + ((dimension.w - WCTooltip.offsetWidth) / 2)) + 'px'; // center tooltip horizontally
    WCTooltip.style.top = (dimension.y + canvasDimension.y - 30) + 'px'; // position above the word
    WCTooltip.style.display = 'block';
}

/** hide the wordcloud tooltip when mouse leaves */
function hideWordCloudTooltip() {
    WCTooltip.style.display = 'none';
}



// event listener for discord toolbar appearing/new DM opening
const observer = new MutationObserver((mutationsList) => {
    if (window.location.href.includes("@me") && window.location.href.length > 32) { // check if current page is a DM/GC
        for (const mutation of mutationsList) {
            for (const node of mutation.addedNodes) {
                if ((node as HTMLElement).querySelector?.(".toolbar__9293f")) { // search for toolbar 
                    console.log("new DM opened");
                    onNewDmOpen()
                }
            }
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });



/**  spawn button in toolbar + get channel name */
async function onNewDmOpen() {
    // spawn button
    const toolbar = document.getElementsByClassName("toolbar__9293f")[0];
    toolbar.appendChild(DDbutton);

    // fetch name of channel
    const response = await fetch(`https://discord.com/api/v9/channels/${BigInt(window.location.href.slice(33))}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "authorization": publicKey
        }
    });

    channel = await response.json()
    console.log("the opened channel:", channel)
}


// on shovel press
async function toggleDD() {

    // close modal (if alrd opened)
    if (discoDig.style.display == "block") {
        discoDig.style.display = "none"
        DDbutton.src = shovelImg
        return
    }

    // else, open modal
    discoDig.style.display = "block"
    DDbutton.src = activeShovelImg


    // display channel name
    if (channel.recipients.length > 1) {
        selectedChannelDisplay.innerHTML = channel.name || `Unnamed GC`
    } else {
        selectedChannelDisplay.innerHTML = `DMs w/ ${channel.recipients[0].username}`
    }


    // set user back to splashScreen IF the dm is a new dm from last time
    if (BigInt(window.location.href.slice(33)) != chatID) {
        chatID = BigInt(window.location.href.slice(33))
        dataScreen.style.display = "none"
        loadingScreen.style.display = "none"
        splashScreen.style.display = "block"
    }
}



/** convert the gifFrequency map to a top 10 list */
function calculateTopTenGifs() {
    console.log(gifFrequency) 
    // go through each gif to determine top 10 list
    gifFrequency.forEach((freq, gif) => {

        // find where the gif fits into the topgifs array
        let i = 9
        while (freq > topGifs[i].freq) {
            i--;
            if (i < 0) {
                break
            }
        }

        // check if while loop ran,
        // then insert the word
        if (i < 9) {
            topGifs.splice(i + 1, 0, { gifLink: gif, freq: freq })
            topGifs.pop()
        }
    });

}

async function fetchTenorGifEmbed(gifId: string) {
    const apiKey = "LIVDSRZULELA"; // tenor PUBLIC api key
    const res = await fetch(`https://g.tenor.com/v1/gifs?ids=${gifId}&key=${apiKey}`);
    const data = await res.json();

    return [data.results[0].media[0].gif.url, data.results[0].media[0].gif.dims];
}


async function displayTopTenGifs() {
    console.log(topGifs)

    const columns = [{ column: document.getElementById(`column-1`)!, aspectRatioSum: 0 }, { column: document.getElementById(`column-2`)!, aspectRatioSum: 0 }, { column: document.getElementById(`column-3`)!, aspectRatioSum: 0 }]
    let gifDims;

    columns[0].column.innerHTML = ""
    columns[1].column.innerHTML = ""
    columns[2].column.innerHTML = ""

    // if no gifs found in chat
    if (gifFrequency.size == 0) {
        columns[1].column.innerHTML = "<p style='text-align: center; color: #F1FFE7;'>no gifs found in chat :(</p>"
        return
    }


    for (const [i, gifItem] of topGifs.entries()) {

        // exit loop if reach empty gif object
        if (gifItem.freq == 0) { break; }

        // if gifLink invalid, skip
        if (!gifItem.gifLink.match(/(\d+)(?:$|\/|\?)/)) { continue }


        const gifId = gifItem.gifLink.match(/(\d+)(?:$|\/|\?)/)![1]; // extract the gifID from the link
        [gifItem.gifLink, gifDims] = await fetchTenorGifEmbed(gifId); // fetch the gif embed link + dimensions


        // for last gif, place it in the shortest column
        if (i == 9) {
            columns.sort((a, b) => b.aspectRatioSum - a.aspectRatioSum)
            columns[0].column.innerHTML += `<img src="${gifItem.gifLink}" alt="${gifItem.freq}">`;
            break
        }

        // add gif to column
        columns[(i % 3)].column.innerHTML += `<img src="${gifItem.gifLink}" alt="${gifItem.freq}">`;
        columns[(i % 3)].aspectRatioSum += gifDims[0] / gifDims[1] // keep track of aspectRatioSum of each column to determine shortest column later
    }

    document.querySelectorAll("#gifGallery img").forEach(e => {
        e.addEventListener("mouseenter", () => {
            let img = e as HTMLImageElement
            let imgBox = img.getBoundingClientRect()

            // set tooltip content and position
            gifTooltip.innerHTML = `Used ${img.alt} time${parseInt(img.alt) > 1 ? 's' : ''}`;
            gifTooltip.style.left = (imgBox.x + ((imgBox.width - 80) / 2)) + 'px'; // center tooltip horizontally
            gifTooltip.style.top = (imgBox.y - 30) + 'px'; // position above the gif
            gifTooltip.style.display = 'block';
            gifTooltip.style.position = "fixed"
        });

        e.addEventListener("mouseleave", () => {
            gifTooltip.style.display = 'none';
        });
    });
}





/** display time graph */
function displayDayTimeGraph() {
    const dayData: Plotly.Data = {
        x: [...datedMessages.keys()].reverse(),
        y: [...datedMessages.values()].reverse(),
        type: 'scatter',
        line: {
            color: 'rgb(255, 255, 255)',
            width: 1
        }
    };

    const timeData: Plotly.Data = {
        x: [
            "12am", "1am", "2am", "3am", "4am", "5am",
            "6am", "7am", "8am", "9am", "10am", "11am",
            "12pm", "1pm", "2pm", "3pm", "4pm", "5pm",
            "6pm", "7pm", "8pm", "9pm", "10pm", "11pm"
        ],
        y: [...timedMessages.values()],
        type: 'scatter',
        line: {
            color: 'rgb(255, 255, 255)',
            width: 1
        }
    };


    Plotly.newPlot(dayGraphDisplay, [dayData],
        {
            title: { text: "Number of Messages Per Day" },
            paper_bgcolor: "rgba(0, 0, 0, 0)",
            plot_bgcolor: "rgba(0, 0, 0, 0)",
            font: { color: '#F1FFE7' },
            margin: {
                r: 40,
                l: 40
            },
            xaxis: {
                showgrid: false
            },
            yaxis: {
                showgrid: false,
                showline: true
            }
        });


    Plotly.newPlot(timeGraphDisplay, [timeData],
        {
            title: { text: "Total Number of Messages Per Time of Day" },
            paper_bgcolor: "rgba(0, 0, 0, 0)",
            plot_bgcolor: "rgba(0, 0, 0, 0)",
            font: { color: '#F1FFE7' },
            margin: {
                r: 40,
                l: 40
            },
            xaxis: {
                showgrid: false
            },
            yaxis: {
                showgrid: false,
                showline: true
            }
        });
}


function fetchWordCloud() {
    // get a list of ALL words 
    // map them
    // convert it to a list
    let allWords: string[] = []

    mappedMessages.forEach((userData) => {
        allWords = allWords.concat(userData.allMessages.join(" ").replace(/[!"”“’#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '').toLowerCase().split(" ").filter(word => (!stopwords.has(word) && !word.startsWith("https") && !(word.length == 18 && !isNaN(parseInt(word))))));
    })


    // map them all
    const mappedWords = new Map();
    allWords.forEach((word) => {
        mappedWords.set(word, (mappedWords.get(word) + 1 || 1));
    })


    const wordCloudList: [string, number][] = []
    mappedWords.forEach((freq, word) => {
        wordCloudList.push([word, freq])
    })


    wordCloudCanvas.width = wordCloudCanvas.offsetWidth;
    wordCloudCanvas.height = wordCloudCanvas.offsetHeight;


    const maxFreq = Math.max(...wordCloudList.map(([_, freq]) => freq));
    const power = 0.6;

    WordCloud(wordCloudCanvas, {
        list: wordCloudList,
        gridSize: 2,
        shape: "circle",
        color: "random-light",
        backgroundColor: "rgb(74, 61, 214)",
        drawOutOfBound: true,
        ellipticity: 1,
        weightFactor: (freq) => {
            const minFontSize = 5;
            const maxFontSize = 70;
            const normalized = Math.pow(freq / maxFreq, power);
            return minFontSize + normalized * (maxFontSize - minFontSize);
        },
        // shrinkToFit: true,
        hover: showWordCloudTooltip
    });
}


/** display the pie chart */
function displayMsgShare() {

    // display user counts
    const data: Plotly.Data[] = [{
        type: "pie",
        values: [...mappedMessages.values()].map(userData => userData.numberOfMessages),
        labels: [...mappedMessages.values()].map(userData => userData.username), // get the userData values, get the usernames, filter the usernames
        textinfo: "label+percent",
        insidetextorientation: "radial",
        automargin: true
    }]

    const layout = {
        paper_bgcolor: "rgba(0, 0, 0, 0)",
        margin: { "t": 0, "b": 0, "l": 0, "r": 0 },
        showlegend: false,
        font: {
            color: '#F1FFE7'
        }
    }

    const userCountDisplay: HTMLElement = document.getElementById('pieChart')!;
    Plotly.newPlot(userCountDisplay, data, layout, { responsive: true })
}


/** Extract emojis from text using regex */
function extractEmojis(text: string): string[] {
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
    return text.match(emojiRegex) || [];
}

function calculateTopTenWordsAndEmojisPerUser() {
    // go through each user's userData
    mappedMessages.forEach((userData) => {

        // generate an array of words used by the user
        const userWords: string[] = userData.allMessages.join(" ").replace(/[!"'#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '').toLowerCase().split(" ").filter(word => (!stopwords.has(word) && !word.startsWith("https") && word != ""));

        // get all emojis used by the user
        const userEmojis: string[] = userData.allMessages.flatMap(msg => extractEmojis(msg));

        // frequency map the words, emojis & pings
        const mappedWords: Map<string, number> = new Map();
        const mappedEmojis: Map<string, number> = new Map();
        const mappedPings: Map<string, number> = new Map();

        userWords.forEach((word) => {

            // check if word is actually a userID
            if (word.length == 18 && !isNaN(parseInt(word))) {

                // update the pinged user's timesPinged
                if (mappedMessages.get(word)) {
                    mappedMessages.get(word)!.timesPinged += 1
                }

                // add pinged user to the ping frequency map
                mappedPings.set(word, (mappedPings.get(word) || 0) + 1);
                return;
            }

            // otherwise just add the word to mappedWords
            mappedWords.set(word, (mappedWords.get(word) || 0) + 1);
        })

        // get handle for user's mostUsedWords list
        const mostPinged = userData.mostPinged

        // find most pinged userID
        mappedPings.forEach((freq, userID) => {
            if (freq > mostPinged.freq) {
                mostPinged.freq = freq
                mostPinged.user = userID
            }
        })

        // convert userID to username (after checking that its not empty)
        if (mostPinged.user != "") {
            mostPinged.user = mappedMessages.get(mostPinged.user)!.username
        }


        // Count emoji frequencies
        userEmojis.forEach(emoji => {
            mappedEmojis.set(emoji, (mappedEmojis.get(emoji) || 0) + 1);
        });

        // get handle for user's mostUsedWords list
        const topWords = userData.mostUsedWords
        const topEmojis = userData.mostUsedEmojis

        // go through each word to determine top 10 list
        mappedWords.forEach((freq, word) => {
            // find where the word fits into user's the topWords
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

        // go through each emoji to determine top 10 list
        mappedEmojis.forEach((freq, emoji) => {
            // find where the emoji fits into user's topEmojis
            let i = 9
            while (freq > topEmojis[i].freq) {
                i--;
                if (i < 0) {
                    break
                }
            }

            // check if while loop ran,
            // then insert the emoji
            if (i < 9) {
                topEmojis.splice(i + 1, 0, { emoji: emoji, freq: freq })
                topEmojis.pop()
            }
        });
    });
}


function displayUserProfile() {
    const selectedUserData: userData = mappedMessages.get(userSelect.value)!
    const topWords = selectedUserData.mostUsedWords
    const topEmojis = selectedUserData.mostUsedEmojis

    userProfilePic.src = `https://cdn.discordapp.com/avatars/${userSelect.value}/${selectedUserData.avatarID}.webp?size=100`

    // display word rankings
    userTopWordsDisplay.innerHTML = ""
    for (const [i, wordObject] of topWords.entries()) {
        if (wordObject.freq == 0) {
            break
        }
        userTopWordsDisplay.innerHTML += ` <li>${i + 1}. ${wordObject.word} (${wordObject.freq})</li>`
    }

    // display emoji rankings
    const userTopEmojisDisplay = document.getElementById("userTopEmojis")!
    userTopEmojisDisplay.innerHTML = ""
    for (const [i, emojiObject] of topEmojis.entries()) {
        if (emojiObject.freq == 0) {
            break
        }
        userTopEmojisDisplay.innerHTML += ` <li>${i + 1}. ${emojiObject.emoji} (${emojiObject.freq})</li>`
    }

    console.log("user's top words", topWords)

    // other stats
    userAvgLengthDisplay.innerHTML = `Average message length: ${Math.round(selectedUserData.avgMsgLength * 100) / 100} words`
    userAvgReplyTimeDisplay.innerHTML = `Average reply time: ${Math.round(selectedUserData.avgReplyTime[0] * 100) / 100} mins`

    if (selectedUserData.mostPinged.freq == 0) {
        userMostPinged.innerHTML = `Bothered nobody`
    } else {
        userMostPinged.innerHTML = `Pinged ${selectedUserData.mostPinged.user} ${selectedUserData.mostPinged.freq} times`
    }

    if (selectedUserData.timesPinged == 0) {
        timesPingedDisplay.innerHTML = `Was never bothered (0 pings)`
    } else {
        timesPingedDisplay.innerHTML = `Was pinged ${selectedUserData.timesPinged} times`
    }

}




// main digging function
async function dig() {
    splashScreen.style.display = "none"
    loadingScreen.style.display = "block"
    userSelect.innerHTML = ""
    userTopWordsDisplay.innerHTML = ""

    // reset stat variables
    mappedMessages.clear()
    datedMessages.clear()
    gifFrequency.clear()
    topGifs = [{ gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }, { gifLink: "", freq: 0 }]

    let link: string;
    let lastID: number = 69;
    let time: number = 420; // just to appease the typescript gods

    // get n
    n = parseInt(nInput.value.replace(/\D/g, ''));

    let timestamp = new Date()

    for (let i = 0; i < Math.ceil(n / 100); i++) {

        // every 10,000 msgs, wait 2s (but skip on first iteration)
        if (i % 100 == 0 && i != 0) { await wait(2000); }

        link = `https://discord.com/api/v9/channels/${chatID}/messages?${(i != 0) && `before=${lastID}`}&limit=100`

        try {
            const response = await fetch(link, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "authorization": publicKey
                }
            });

            // throw errors if response !ok
            if (!response.ok) {
                const error = await response.json();

                if (response.status == 429) {
                    console.log(error)
                    console.log(error.retry_after)
                    alert("error 429: discodig got rate limited - please try again later :(")
                    throw new Error("getting rate limited")
                }
                else {
                    console.log("some non-429 api error")
                    throw new Error(error)
                }
            }

            const msgs: {
                id: number,
                author: {
                    username: string,
                    id: string,
                    avatar: string,
                    bot: boolean
                },
                content: string
            }[] = await response.json();

            if (msgs.length == 0) {
                console.log("prematurely reached end of chats")
                break
            }

            msgs.forEach((msg, i) => {
                // ignore msg if sent by a bot or deleted user
                if (msg.author.bot == true || msg.author.username == "Deleted User") { return }

                // if user hasn't been added yet, initialize them
                if (!mappedMessages.has(msg.author.id)) {
                    mappedMessages.set(msg.author.id, {
                        username: msg.author.username,
                        avatarID: msg.author.avatar,
                        allMessages: [],
                        mostUsedWords: [{ word: "", freq: 0 }, { word: "", freq: 0 }, { word: "", freq: 0 }, { word: "", freq: 0 }, { word: "", freq: 0 }, { word: "", freq: 0 }, { word: "", freq: 0 }, { word: "", freq: 0 }, { word: "", freq: 0 }, { word: "", freq: 0 }],
                        mostUsedEmojis: [{ emoji: "", freq: 0 }, { emoji: "", freq: 0 }, { emoji: "", freq: 0 }, { emoji: "", freq: 0 }, { emoji: "", freq: 0 }, { emoji: "", freq: 0 }, { emoji: "", freq: 0 }, { emoji: "", freq: 0 }, { emoji: "", freq: 0 }, { emoji: "", freq: 0 }],
                        avgMsgLength: 0,
                        numberOfMessages: 0,
                        avgReplyTime: [0, 0],
                        mostPinged: { user: "", freq: 0 },
                        timesPinged: 0,
                    })
                    userSelect.innerHTML += ` <option value="${msg.author.id}">${msg.author.username}&nbsp</option>`
                }


                // update user's data
                const userData = mappedMessages.get(msg.author.id)!;
                userData.allMessages.push(msg.content)
                userData.numberOfMessages += 1;
                userData.avgMsgLength = userData.avgMsgLength * (1 - (1 / userData.numberOfMessages)) + msg.content.split(" ").length * (1 / userData.numberOfMessages)

                // if msg is a gif, add the gif to frequency list
                if (msg.content.indexOf('https://tenor.com/view') != -1) {
                    gifFrequency.set(msg.content, (gifFrequency.get(msg.content)! + 1 || 1))
                }

                // get time of the msg
                const newTimestamp: Date = snowflakeToDate(msg.id)

                // get time between msgs
                const minutes: number = (+timestamp - +newTimestamp) / (1000 * 60);

                // check if there is a missing date (time between consecutive msgs > 1 day)
                // ("+" to convert date to milliseconds)
                if ((minutes / (60 * 24)) > 1) {

                    // if so, fill in the dates
                    const addedDate = new Date(timestamp);
                    addedDate.setDate(addedDate.getDate() - 1);

                    while (addedDate > newTimestamp) {
                        datedMessages.set(addedDate.toLocaleDateString(), 0)
                        addedDate.setDate(addedDate.getDate() - 1);
                    }

                    // else (since the delay isn't > 1 day), see if the reply time is valid to add to their avgReplyTime calculation
                    // conditions for the reply time to be valid: you're not on the first msg, the 2 msgs are on the same day*, and they're not replying to themself
                    // *disregard msgs that are on 2 different days. it's likely not a reply to the conversation. even if it is, it's only like 1 msg we are ommitting from the data
                } else if (i != 0 && timestamp.getDate() == newTimestamp.getDate() && msgs[i - 1].author.username != msg.author.username) {

                    // skip updating the last user's reply time if the last user doesn't exist (happens if last user was a bot)
                    if (mappedMessages.get(msgs[i - 1].author.id)) {
                        const lastUserData = mappedMessages.get(msgs[i - 1].author.id)!

                        lastUserData.avgReplyTime[1] += 1 // update number of valid "avgReplyTime" msgs
                        lastUserData.avgReplyTime[0] = lastUserData.avgReplyTime[0] * (1 - 1 / lastUserData.avgReplyTime[1]) + minutes * (1 / lastUserData.avgReplyTime[1])
                    }
                }


                timestamp = newTimestamp
                const date = timestamp.toLocaleDateString()
                time = timestamp.getHours()

                datedMessages.set(date, (datedMessages.get(date) || 0) + 1);
                timedMessages.set(time, (timedMessages.get(time) || 0) + 1);
            })


            lastID = msgs[msgs.length - 1].id

            progressStatus.innerHTML = `${((i + 1) * 100).toLocaleString()} / ${n.toLocaleString()} messages loaded`
            loadingBar.style.width = `${((i + 1) * 100 / n) * 100}%`

        } catch (error) { console.error(error); }
    }


    loadingScreen.style.display = "none"
    dataScreen.style.display = "flex"


    displayMsgShare()

    fetchWordCloud()

    displayDayTimeGraph()

    calculateTopTenWordsAndEmojisPerUser()
    displayUserProfile()

    calculateTopTenGifs()
    displayTopTenGifs()
}