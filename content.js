// Load PDF.js library
//this is content.js
const script = document.createElement('script');
script.src = chrome.runtime.getURL('pdf.min.js');
document.head.appendChild(script);

// Function to fetch OpenAI data
async function fetchOpenAIData(resumeText) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer <<your api key here>>' // Replace with your actual API key
            },
            body: JSON.stringify({

                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Summarize this resume so the recruiter does not have to read the whole resume. Very important: Keep the summary within 4-6 short bullet points, and only highlight the most important things they have done. Put emphasis on exactly what work was achieved. An example would be **Job Experience** -Reduced ineffiency by 40% at google -Solved microsofts ui issue in 40 days **Education** -Computer Engineering at Uwaterloo -Harvard CS50x certificate ...'},
                    { role: 'user', content: `Resume: ${resumeText}` }
                ],
                max_tokens: 300
                
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error Fetching Data From OpenAI:', error);
        return 'Error Fetching Data';
    }
}

// Function to extract PDF text
async function extractPDFText(PDF_URL) {
    try {
        const response = await fetch(PDF_URL);
        const arrayBuffer = await response.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;

        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ');
        }
        return text;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return '';
    }
}
function extractPDFLinks(content) {
    // Use a regular expression to find URLs
    const urlPattern = /http[s]?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/g;
    return content.match(urlPattern) || [];
}

// Function to show popup
function showPopup() {

    let popupDiv = document.querySelector('#resume-summary-popup');
    
    if (popupDiv) 
    {
    return popupDiv; // Reuse the existing popup
    }


    popupDiv = document.createElement('div');
    popupDiv.id = 'resume-summary-popup';
    popupDiv.style.position = 'fixed';
    popupDiv.style.top = '50px';
    popupDiv.style.left = '50px';
    popupDiv.style.zIndex = '9999';
    popupDiv.style.width = '300px';
    popupDiv.style.height = '400px';
    popupDiv.style.padding = '10px';
    popupDiv.style.color = '#2cc77f';
    popupDiv.style.background = 'radial-gradient(circle, rgba(4,36,25,1) 0%, rgba(0,0,0,1) 100%)';
    popupDiv.style.border = '1px solid #000000';
    popupDiv.style.cursor = 'move';
    popupDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1 style="margin: 0;">Resume Summary</h1>
            <button id="closeBtn" style="background-color: #000000; color: #ffffff; border: none; font-size: 20px; cursor: pointer;">&times;</button>
        </div>
        <div id="content" style="overflow-y: auto; height: calc(100% - 60px);"></div>
        <div class="resize-handle ne"></div>
        <div class="resize-handle nw"></div>
        <div class="resize-handle se"></div>
        <div class="resize-handle sw"></div>
    `;
    document.body.appendChild(popupDiv);

    const styles = document.createElement('style');
    styles.innerHTML = `
        .resize-handle {
            width: 20px;
            height: 20px;
            position: absolute;
            background: transparent;
        }
        .ne {
            cursor: ne-resize;
            top: -10px;
            right: -10px;
        }
        .nw {
            cursor: nw-resize;
            top: -10px;
            left: -10px;
        }
        .se {
            cursor: se-resize;
            bottom: -10px;
            right: -10px;
        }
        .sw {
            cursor: sw-resize;
            bottom: -10px;
            left: -10px;
        }
    `;
    document.head.appendChild(styles);

    let isDragging = false;
    let offsetX, offsetY;

    popupDiv.addEventListener('mousedown', function(e) {
        if (e.target !== document.getElementById('closeBtn') && !e.target.classList.contains('resize-handle')) {
            isDragging = true;
            offsetX = e.clientX - popupDiv.offsetLeft;
            offsetY = e.clientY - popupDiv.offsetTop;
            popupDiv.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            popupDiv.style.left = e.clientX - offsetX + 'px';
            popupDiv.style.top = e.clientY - offsetY + 'px';
        }
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
        popupDiv.style.cursor = 'move';
    });

    document.getElementById('closeBtn').addEventListener('click', function() {
        popupDiv.remove();
    });

    const handles = document.querySelectorAll('.resize-handle');
    let isResizing = false;
    let currentHandle = null;

    handles.forEach(handle => {
        handle.addEventListener('mousedown', function(e) {
            isResizing = true;
            currentHandle = e.target;
            document.body.style.cursor = currentHandle.style.cursor;
        });
    });

    document.addEventListener('mousemove', function(e) {
        if (isResizing) {
            const rect = popupDiv.getBoundingClientRect();
            if (currentHandle.classList.contains('ne')) {
                popupDiv.style.width = e.clientX - rect.left + 'px';
                popupDiv.style.height = rect.bottom - e.clientY + 'px';
                popupDiv.style.top = e.clientY + 'px';
            } else if (currentHandle.classList.contains('nw')) {
                popupDiv.style.width = rect.right - e.clientX + 'px';
                popupDiv.style.height = rect.bottom - e.clientY + 'px';
                popupDiv.style.top = e.clientY + 'px';
                popupDiv.style.left = e.clientX + 'px';
            } else if (currentHandle.classList.contains('se')) {
                popupDiv.style.width = e.clientX - rect.left + 'px';
                popupDiv.style.height = e.clientY - rect.top + 'px';
            } else if (currentHandle.classList.contains('sw')) {
                popupDiv.style.width = rect.right - e.clientX + 'px';
                popupDiv.style.height = e.clientY - rect.top + 'px';
                popupDiv.style.left = e.clientX + 'px';
            }
        }
    });

    document.addEventListener('mouseup', function() {
        isResizing = false;
        currentHandle = null;
        document.body.style.cursor = 'default';
    });

    return popupDiv;
}

// Function to sleep for a given time
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatSummaryAsBulletPoints(summary) {
    // Remove the word "Summary" from the text if present
    const cleanedSummary = summary.replace(/^\s*Summary\s*[:\-\s]*/i, '').trim();

    // Split the cleaned summary by newline characters
    const lines = cleanedSummary.split('\n').filter(line => line.trim() !== '');

    // Create list items for each non-empty line
    const listItems = lines.map(line => `<li>${line.trim()}</li>`).join('');

    // Wrap the list items in an unordered list
    return `<ul>${listItems}</ul>`;
}


// Main function to process the PDF and show the popup
async function processPDFAndShowPopup() {
    const popupDiv = showPopup();
    const contentDiv = popupDiv.querySelector('#content');
    contentDiv.innerHTML = 'Loading...';

    let pdfLink = null;
    let time = 0;
    await sleep(1000);
    while (time < 15) {
        pdfLink = document.querySelector('a[href$=".pdf"]');
        contentDiv.innerHTML = 'Searching For PDF...';
        if (pdfLink) break;
        await sleep(500);
        time++;
    }

    if (!pdfLink) {
        contentDiv.innerHTML = 'No PDF found on this page.';
        return;
    }

    const PDF_URL = pdfLink.href;
    const pdfText = await extractPDFText(PDF_URL);

    if (pdfText) {
        const extractedLinks = extractPDFLinks(pdfText);
        const summary = await fetchOpenAIData(pdfText);
        const formattedSummary = formatSummaryAsBulletPoints(summary);
        contentDiv.innerHTML = `<p><strong>Summary:</strong></p><p>${formattedSummary}</p>`;
        if (extractedLinks.length > 0) {
            contentDiv.innerHTML += '<p><strong>Extracted Links:</strong></p><ul>' + extractedLinks.map(link => `<li><a href="${link}" target="_blank">${link}</a></li>`).join('') + '</ul>';
        }
    } else {
        contentDiv.innerHTML = 'Failed to extract text from the PDF.';
    }
}

// Start processing after 4 seconds
sleep(4000).then(() => {
    processPDFAndShowPopup();
    console.log("STARTING");
});

// Add a function to detect URL changes in Single Page Applications
function detectURLChange(callback) {
    let lastURL = window.location.href;

    // Intercept pushState and replaceState
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    history.pushState = function() {
        pushState.apply(history, arguments);
        callback();
    };

    history.replaceState = function() {
        replaceState.apply(history, arguments);
        callback();
    };

    // Handle browser navigation (back/forward button)
    window.addEventListener('popstate', function() {
        callback();
    });

    // Poll for URL changes (in case some navigation mechanisms bypass the above)
    setInterval(() => {
        const currentURL = window.location.href;
        if (currentURL !== lastURL) {
            lastURL = currentURL;
            callback();
        }
    }, 1000); // Polling interval (1 second)
}

// Main function to reload and reprocess the PDF when the URL changes
function onURLChange() {
    console.log("URL changed, checking for new PDF...");
    processPDFAndShowPopup();  // Call the function to resummarize the new PDF
}

// Start URL detection
detectURLChange(onURLChange);

// Initial call to process the first PDF
processPDFAndShowPopup();
