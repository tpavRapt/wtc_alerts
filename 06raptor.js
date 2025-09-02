// Initialize LokiJS database and collection for messages
var db = new loki('messages.db');
var messagesCollection = db.addCollection('messages');

// IndexedDB helpers
const WTC_DB_NAME = 'WTCAlertsDB';
const WTC_STORE_NAME = 'messages';
let indexedDb;

// Open IndexedDB and create object store if needed
function openIndexedDb() {
    return new Promise((resolve, reject) => {
        const req = window.indexedDB.open(WTC_DB_NAME, 1);
        req.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(WTC_STORE_NAME)) {
                db.createObjectStore(WTC_STORE_NAME, { keyPath: 'MessageID' });
            }
        };
        req.onsuccess = function (event) {
            indexedDb = event.target.result;
            resolve(indexedDb);
        };
        req.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

// Insert or update a message in IndexedDB
function upsertIndexedDbMessage(msg) {
    if (!indexedDb) return;
    const tx = indexedDb.transaction([WTC_STORE_NAME], 'readwrite');
    const store = tx.objectStore(WTC_STORE_NAME);
    store.put(msg);
}

// Get a message by MessageID from IndexedDB
function getIndexedDbMessage(messageId) {
    return new Promise((resolve, reject) => {
        if (!indexedDb) return resolve(null);
        const tx = indexedDb.transaction([WTC_STORE_NAME], 'readonly');
        const store = tx.objectStore(WTC_STORE_NAME);
        const req = store.get(messageId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

$(document).ready(function() {
    var table = $('#messagesTable').DataTable({
        responsive: true,
        columnDefs: [
            {
                className: 'details-control',
                orderable: false,
                data: null,
                defaultContent: '',
                targets: 0
            },
            {
                name: 'compositeID',
                targets: 1,
                visible: false
            },
            {
                name: 'Reason',
                targets: 3, 
                width: '230px'
            },
            {
                name: 'RefTierMessageID',
                targets: 5,
                visible: false
            },
            {
                name: 'MessageID',
                targets: 6,
                visible: false
            },
            {
                targets: 8,
                visible: false
            },
            {
                targets: 12,
                visible: false
            }
        ],
        order: [[11, 'desc']]
    });    

    function formatPrice(price) {
        var userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined

        return isNaN(price) ? price : new Intl.NumberFormat(userLocale, {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }

    function formatNumber(number) {
        var userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined
        return new Intl.NumberFormat(userLocale, {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number);
    }

    function formatShares(number) {
        if (isNaN(number) === true) { 
            return '1';
        } else {

        var userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined
        return new Intl.NumberFormat(userLocale, {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
        }
    }

    function fullSide(string) {
        const fullstring = (string === 'B') ? '<div class="badge badge-phoenix fs-10 badge-tj-success"><span class="fw-bold">BUY</span></div>' : 
        '<div class="badge badge-phoenix fs-10 badge-tj-danger"><span class="fw-bold">SELL</span></div>';
        return fullstring;
    }

    function numberToPercentage(number) {
        return (number * 1).toFixed(2) + '%';
    }

    function loadSalesDashboard(event){
        let tr = $(this).closest('tr');
        let row = table.row(tr);
        let rowClient = row.data()[2];
        let rowSymbol = row.data()[7];

        
        console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
        const getDashboard = new PostMessage({ type: rowClient, Symbol: rowSymbol });
        window.chrome.webview.postMessage(receivedMessage.openFilteredDashboard());
        
        
    }

    function loadNews(event){
        let tr = $(this).closest('tr');
        let row = table.row(tr);
        let rowClient = row.data()[2];
        let rowSymbol = row.data()[7];

        
        console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
        const getDashboard = new PostMessage({ type: rowClient, Symbol: rowSymbol });
        window.chrome.webview.postMessage(receivedMessage.openFilteredDashboard());
        
        
    }

    function sideTendency(number) {
        if (number > 0 ) {
            tendency = ' <div class="badge badge-phoenix fs-10 badge-tj-success"><span class="fw-bold">LIKELY BUYER</span></div>';
        } else if (number < 0) {
            tendendy = ' <div class="badge badge-phoenix fs-10 badge-tj-danger"><span class="fw-bold">LIKELY SELLER</span></div>';
        } else {
            tendency = '';
        }
        return tendency;
    }
    
    function formatSingleField(singleField) {

        if (singleField === '13F') {
            return '<div class="badge-link fs-10 badge-tj-primary"><span class="fw-bold">13F</span></div>';
        } else if (singleField === 'H') {
            return '<div class="badge-link fs-10 badge-tj-warning"><span class="fw-bold">O-HIST</span></div>';
        } else if (singleField === 'IH') {
            return '<div class="badge-link fs-10 badge-tj-warning"><span class="fw-bold">I-HIST</span></div>';
        } else if (singleField === 'I') {
            return '<div class="badge-link fs-10 badge-tj-secondary"><span class="fw-bold">I-CROSS</span></div>';
        } else if (singleField === 'O') {
            return '<div class="badge-link fs-10 badge-tj-secondary"><span class="fw-bold">O-CROSS</span></div>';
        } else if (singleField === 'CRM') {
            return '<div class="badge-link fs-10 badge-tj-success"><span class="fw-bold">CRM</span></div>';
        } else if (singleField === 'Dirty') {
            return '<div class="badge badge-phoenix fs-10 badge-tj-warning"><span class="fw-bold">New</span></div>';
        } else if (singleField === 'Acknowledged') {
            return '<div class="badge badge-phoenix fs-10 badge-tj-success"><span class="fw-bold">Acknowledged</span></div>';
        } else if (singleField === 'B') {
            return 'BUY';
        } else if (singleField === 'S') {
            return 'SELL';
        }

        return singleField; // Return the original field if no transformation is needed
    }
    
    function WTCFormat(field) {
        if (typeof field === 'string' && field.includes(',')) {
            return field
                .split(',')
                .map(f => f.trim())
                .filter(f => f !== 'IH')  // Filter out 'IH' values
                .map(f => formatSingleField(f))
                .join(' ');
        } else {
            return field === 'IH' ? '' : formatSingleField(field);
        }
    }

    function fistUserName(field){
        if (typeof field === 'string' && field.includes(',')) {
            return firstValue = field.split(',')[0];
        } else {
            return field;
        }
    }

    function removeMilliseconds(field){
        let noMili = field.split('.')[0];
        return noMili;
    }

    function addAlertMessage(message) {
        var compositeKey = message.MessageID + '_' + message.RefTierMessageID;       
        table.row.add([
            '',
            compositeKey,
            message.CompanyAlias,
            Array.isArray(message.CompanyMatchAttrib) ?  message.CompanyMatchAttrib.map(WTCFormat).join(' ') : WTCFormat(message.CompanyMatchAttrib),            
            WTCFormat(message.RecordState) || 'Missing',
            message.RefTierMessageID || 'Missing',
            message.MessageID || 'Missing',
            message.Symbol || 'Missing',
            message.MessageID || 'Missing',
            formatShares(message.IOIShares) || 'Missing',
            WTCFormat(message.Side) || 'Missing',
            removeMilliseconds(message.CompletionTime) || 'Missing',
            message.RefHoldingsCompany || 'Missing',
            '<div class="badge-news fs-10 badge-tj-success"><span class="fw-bold">READ</span></div>'
        ]).node().id = 'row-' + compositeKey;
        table.draw();
    }

    function addDetails(message, type, database) {       
        var compositeKey = message.rowId || (message.MessageID + '_' + message.RefTierMessageID);
        var row = table.row('#row-' + compositeKey);    
        


        console.log(`Adding details for compositeKey: ${compositeKey} of type: ${type} and database ${database}`);    

        if (row.length) {
            var tr = $(row.node());
            let holdingsDetails = '';
            let ioiDetails = '';
            let orderDetails = '';
            let histDetails = '';
            let alertIOIDetails = '';

            // Redundant? Check later
            // if (type === 'ALERT') {
            //     alertIOIDetails = getFormattedDetails(message, 'ALERT');
            // }        
            
            //Details for Holdings Data
            if (type === 'HoldingsData') {
                holdingsDetails = getFormattedDetails(message, 'HoldingsData');
            }

            // Details for INTRADAY Order
            if (type === 'FSMDCOrder' && database === 'MESSAGE') {
                orderDetails = getFormattedDetails(message, 'FSMDCOrder');
            }

            // Details for teh Historical Order
            if ((type === 'FSMDCOrder' || type === 'FSMInOrder') && database === 'HISTORY_DB') {
                histDetails = getFormattedDetails(message, 'HIST');
            }            

            if (type === 'IOI' && !message.type) {
                //console.log('It did find type = IOI');
                ioiDetails = getFormattedDetails(message, 'IIOI');
            }

            //Detaisl for IOI that generated the Alert
            if (message.type === 'ALERTIOI') {
                alertIOIDetails = getFormattedDetails(message, 'ALERTIOI');
            }

            if (!row.child.isShown()) {
                let childContent = `
                        <tr>
                            <td style="vertical-align: top;" id="alert-${compositeKey}">${alertIOIDetails}</td>    
                            <td style="vertical-align: top;" id="orders-${compositeKey}">${orderDetails}</td>
                            <td style="vertical-align: top;" id="hist-${compositeKey}">${histDetails}</td>
                            <td style="vertical-align: top;" id="ioi-${compositeKey}">${ioiDetails}</td>
                            <td style="vertical-align: top;" id="holdings-${compositeKey}">${holdingsDetails}</td>
                        </tr>
                `;
                row.child(childContent).show();
                tr.addClass('shown');
    
            } else {
                // If the row is already shown, update its content separately
                if (type === 'HoldingsData') {
                    // Only update the Holdings cell
                    $(`#holdings-${compositeKey}`).html(holdingsDetails);
                }
                if (type === 'FSMDCOrder' && database === 'MESSAGE') {
                    // Only update the Order cell
                    $(`#orders-${compositeKey}`).html(orderDetails);
                }
                if ((type === 'FSMInOrder' || type === 'FSMDCOrder')  && database === 'HISTORY_DB') {
                    // Only update the History cell
                    $(`#hist-${compositeKey}`).html(histDetails);
                }                
                // if (type === 'IOI') {
                //     $(`#alert-${compositeKey}`).html(alertIOIDetails);
                // }
                if (type === 'IOI' && !message.type) {
                    $(`#ioi-${compositeKey}`).html(ioiDetails);
                }
            }
        } else {
            console.error(`Row not found for compositeKey: ${compositeKey}`);
        }
    }

    function calcPercentage(a, b){

        if (isNaN(b) === true) {
            const na = Number(a);
            const nb = '1';
            let result = na / nb;
            return result;        
        } else {
            const na = Number(a);
            const nb = Number(b);
            let result = na / nb;
            return result * 100;
        }          
        
        
    }
       
    function getFormattedDetails(message, type) {
        let formattedDetails = '';
        console.log(`DEBUG: MsgType ${type} was received.`);
        if (type === 'ALERTIOI') {
            console.log('Starting ALERT IOI list');
            const fields = ['Received IOI', 'Time', 'Symbol', 'Price', 'Side', 'IOIShares', 'User'];
            const selectedData = {
                'Received IOI': message.IOIAttrib[0]  || 'Missing',
                Time: removeMilliseconds(message.CompletionTime) || 'Missing',
                Symbol: message.Symbol + ` (${message.ExDestination})`|| 'Missing',
                Price: (message.OrdType === 'Market') ? message.OrdType : formatPrice(message.RefOrderPrice) || 'Market',
                Side: fullSide(message.Side) || 'Missing',
                IOIShares: formatShares(message.IOIShares) || 'Missing',
                User: fistUserName(message.SourceLogonName) || 'Missing',
            };
            // Wrap in a styled div for the child row
            formattedDetails = `
            <div style="
                background: #181b20;
                border: 2px solid orange;
                border-radius: 22px;
                padding: 18px 24px 14px 24px;
                color: #fff;
                font-size: 1 em;
                min-width: 240px;
                max-width: 320px;
                margin: 0 auto;
                box-shadow: 0 2px 12px #0003;
            ">
                <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                    <li >
                        <span style="font-weight: bold; color: orange;">Received IOI:</span>
                        <span style="margin-left: 8px;">${selectedData['Received IOI']}</span>
                    </li>
                    <li >
                        <span style="font-weight: bold; color: #fff;">Time:</span>
                        <span style="margin-left: 8px;">${selectedData['Time']}</span>
                    </li>
                    <li >
                        <span style="font-weight: bold; color: #fff;">Symbol:</span>
                        <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                    </li>
                    <li >
                        <span style="font-weight: bold; color: #fff;">Price:</span>
                        <span style="margin-left: 8px;">${selectedData['Price']}</span>
                    </li>
                    <li >
                        <span style="font-weight: bold; color: #fff;">Side:</span>
                        <span style="margin-left: 8px;">${selectedData['Side']}</span>
                    </li>
                    <li >
                        <span style="font-weight: bold; color: #fff;">IOIShares:</span>
                        <span style="margin-left: 8px;">${selectedData['IOIShares']}</span>
                    </li>
                    <li ">
                        <span style="font-weight: bold; color: #fff;">User:</span>
                        <span style="margin-left: 8px;">${selectedData['User']}</span>
                    </li>
                </ul>
            </div>
            `;
        } else if (type === 'HoldingsData') {
            console.log('INFO: Starting HOLDINGS Details');
            const fields = ['Type', 'Symbol', 'Exchange', 'Account', 'Shares Held', '% held', 'Delta Shares', 'Filing Date'];
            const selectedData = {
                Type: message.MsgType || 'Missing',
                Symbol: message.Symbol || 'Missing',
                Exchange: message.Exchange || 'Missing',
                Account: message.HoldingsAccount || 'Missing',
                'Shares Held': formatNumber(message.HoldingsSharesHeld) || 'Missing',
                '% held': numberToPercentage(message.HoldingsPercentHeld) || 'Missing',
                'Delta Shares': formatShares(message.HoldingsSharesDelta) + sideTendency(message.HoldingsSharesDelta) || 'Missing',
                'Filing Date': message.HoldingsDate || 'Missing'
            };    

            formattedDetails = `
            <div style="
                background: #181b20;
                border: 2px solid ;
                border-radius: 22px;
                padding: 18px 24px 14px 24px;
                color: #fff;
                font-size: 1 em;
                min-width: 240px;
                max-width: 340px;
                margin: 0 auto;
                box-shadow: 0 2px 12px #0003;
            ">
                <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                    <li style="margin-bottom: 8px; background: #2d3035;">
                        <span style="font-weight: bold; color: orange;">Type:</span>
                        <span style="margin-left: 8px;">${selectedData['Type']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Symbol:</span>
                        <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Exchange:</span>
                        <span style="margin-left: 8px;">${selectedData['Exchange']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Account:</span>
                        <span style="margin-left: 8px;">${selectedData['Account']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Shares Held:</span>
                        <span style="margin-left: 8px;">${selectedData['Shares Held']}</span>
                    </li>
                    <li">
                        <span style="font-weight: bold; color: #fff;">% held:</span>
                        <span style="margin-left: 8px;">${selectedData['% held']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Delta Shares:</span>
                        <span style="margin-left: 8px;">${selectedData['Delta Shares']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Filing Date:</span>
                        <span style="margin-left: 8px;">${selectedData['Filing Date']}</span>
                    </li>
                </ul>
            </div>
            `;

        } else if (type === 'FSMDCOrder') {
            console.log('INFO: Starting INTRADAY ORDER Details');
            const fields = ['Type', 'Time', 'Symbol', 'Qty (avai/exec)', 'Price', 'Side', 'User'];
            const selectedData = {
                Type: (message.MsgType === 'FSMDCOrder') ? 'Order' : '?',
                Time: removeMilliseconds(message.CompletionTime) || 'Missing',
                Symbol: message.Symbol + ` (${message.RAIExchangeID})`|| 'Missing',
                Price:  ((message.AvgPx === '0') ?  formatPrice(message.AvgPx): 'Market')  || 'Missing',
                'Qty (avai/exec)': (formatShares(message.AvailQty) + ' / ' + formatShares(message.CumQty)  + ' (' + calcPercentage(message.CumQty, message.AvailQty) + '%)') || 'Missing',
                Side: fullSide(message.Side) || 'Missing',
                User: fistUserName(message.SourceLogonName) || 'Missing'
            };
            formattedDetails = `
            <div style="
                background: #181b20;
                border: 2px solid;
                border-radius: 22px;
                padding: 18px 24px 14px 24px;
                color: #fff;
                font-size: 1 em;
                min-width: 240px;
                max-width: 340px;
                margin: 0 auto;
                box-shadow: 0 2px 12px #0003;
            ">
                <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                    <li style="margin-bottom: 8px; background: #2d3035;">
                        <span style="font-weight: bold;">${selectedData['Type']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Time:</span>
                        <span style="margin-left: 8px;">${selectedData['Time']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Symbol:</span>
                        <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Qty (avai/exec):</span>
                        <span style="margin-left: 8px;">${selectedData['Qty (avai/exec)']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Price:</span>
                        <span style="margin-left: 8px;">${selectedData['Price']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Side:</span>
                        <span style="margin-left: 8px;">${selectedData['Side']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">User:</span>
                        <span style="margin-left: 8px;">${selectedData['User']}</span>
                    </li>
                </ul>
            </div>
            `;
        
        } else if (type === 'FSMInOrder') {
            console.log('WARNING: Starting INTRADAY ORDER Details - THIS MESSAGE SHOULD NOT BE HERE!!!');
            const fields = ['Type', 'Time', 'Symbol', 'Qty (avai/exec)', 'Price', 'Side', 'User'];
            const selectedData = {
                Type: (message.MsgType === 'FSMInOrder') ? 'Historical Order' : '?',
                Time: removeMilliseconds(message.CompletionTime) || 'Missing',
                Symbol: message.Symbol + ` (${message.RAIExchangeID})`|| 'Missing',
                Price:  ((message.AvgPx === '0') ?  formatPrice(message.AvgPx): 'Market')  || 'Missing',
                'Qty (avai/exec)': (formatShares(message.AvailQty) + ' / ' + formatShares(message.CumQty)  + ' (' + calcPercentage(message.CumQty, message.AvailQty) + '%)') || 'Missing',
                Side: fullSide(message.Side) || 'Missing',
                User: fistUserName(message.SourceLogonName) || 'Missing'
            };
            formattedDetails = `
            <div style="
                background: #181b20;
                border: 2px solid ;
                border-radius: 22px;
                padding: 18px 24px 14px 24px;
                color: #fff;
                font-size: 1em;
                min-width: 240px;
                max-width: 340px;
                margin: 0 auto;
                box-shadow: 0 2px 12px #0003;
            ">
                <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                    <li>
                        <span style="font-weight: bold;">${selectedData['Type']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Time:</span>
                        <span style="margin-left: 8px;">${selectedData['Time']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Symbol:</span>
                        <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Qty (avai/exec):</span>
                        <span style="margin-left: 8px;">${selectedData['Qty (avai/exec)']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Price:</span>
                        <span style="margin-left: 8px;">${selectedData['Price']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Side:</span>
                        <span style="margin-left: 8px;">${selectedData['Side']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">User:</span>
                        <span style="margin-left: 8px;">${selectedData['User']}</span>
                    </li>
                </ul>
            </div>
            `;

        } else if (type === 'HIST') {
            console.log('INFO: Starting HISTORICAL ORDER Details');
            const fields = ['Type', 'Time', 'Symbol', 'Qty (avai/exec)', 'Price', 'Side', 'User'];
            const selectedData = {
                Type: ((message.MsgType === 'FSMDCOrder' || message.MsgType === 'FSMInOrder') && message.database === 'HISTORY_DB') ? 'Historical Order' + ` (${message.MsgType})` : '?',
                Time: removeMilliseconds(message.CompletionTime) || 'Missing',
                Symbol: message.Symbol + ` (${message.RAIExchangeID})` || 'Missing',
                Price:  ((message.AvgPx === '0') ?  formatPrice(message.AvgPx): 'Market')  || 'Missing',
                'Qty (avai/exec)': (formatShares(message.OrderQty) + ' / ' + formatShares(message.CumQty)  + ' (' + calcPercentage(message.CumQty, message.OrderQty) + '%)') || 'Missing',
                Side: fullSide(message.Side) || 'Missing',
                User: fistUserName(message.SourceLogonName) || 'Missing'
            };
            formattedDetails = `
            <div style="
                background: #181b20;
                border: 2px solid ;
                border-radius: 22px;
                padding: 18px 24px 14px 24px;
                color: #fff;
                font-size: 1em;
                min-width: 240px;
                max-width: 340px;
                margin: 0 auto;
                box-shadow: 0 2px 12px #0003;
            ">
                <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                    <li>

                        <span style="font-weight: bold;">${selectedData['Type']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Time:</span>
                        <span style="margin-left: 8px;">${selectedData['Time']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Symbol:</span>
                        <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Qty (avai/exec):</span>
                        <span style="margin-left: 8px;">${selectedData['Qty (avai/exec)']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Price:</span>
                        <span style="margin-left: 8px;">${selectedData['Price']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Side:</span>
                        <span style="margin-left: 8px;">${selectedData['Side']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">User:</span>
                        <span style="margin-left: 8px;">${selectedData['User']}</span>
                    </li>
                </ul>
            </div>
            `;
        } else if (type === 'IOI' || type === 'IIOI') {
            console.log('Starting ALERT IOI list');
            const fields = ['Type', 'Time', 'Symbol', 'Price', 'Side', 'IOIShares', 'User'];
            const selectedData = {
                Type: 'Intraday IOI' || 'Missing',
                Time: removeMilliseconds(message.CompletionTime) || 'Missing',
                Symbol: message.Symbol + ` (${message.ExDestination})`|| 'Missing',
                Price: (message.OrdType === 'Market') ? message.OrdType : formatPrice(message.RefOrderPrice) || 'Market',
                Side: fullSide(message.Side) || 'Missing',
                IOIShares: formatShares(message.IOIShares) || 'Missing',
                User: fistUserName(message.SourceLogonName) || 'Missing',
            };
            formattedDetails = `
            <div style="
                background: #181b20;
                border: 2px solid;
                border-radius: 22px;
                padding: 18px 24px 14px 24px;
                color: #fff;
                font-size: 1em;
                min-width: 240px;
                max-width: 340px;
                margin: 0 auto;
                box-shadow: 0 2px 12px #0003;
            ">
                <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                    <li>

                        <span style="font-weight: bold;">${selectedData['Type']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Time:</span>
                        <span style="margin-left: 8px;">${selectedData['Time']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Symbol:</span>
                        <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Price:</span>
                        <span style="margin-left: 8px;">${selectedData['Price']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">Side:</span>
                        <span style="margin-left: 8px;">${selectedData['Side']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">IOIShares:</span>
                        <span style="margin-left: 8px;">${selectedData['IOIShares']}</span>
                    </li>
                    <li>
                        <span style="font-weight: bold; color: #fff;">User:</span>
                        <span style="margin-left: 8px;">${selectedData['User']}</span>
                    </li>
                </ul>
            </div>
            `;
        } else {
            console.log(`ERROR: MsgType of ${type} is not recognized.`);
        }    
        return formattedDetails;
    } 
    
    function updateAlertMessage(message, row, compositeKey) {
        row.data([
            '',
            compositeKey,
            message.CompanyAlias,
            Array.isArray(message.CompanyMatchAttrib) ? message.CompanyMatchAttrib.map(WTCFormat).join(' ') : WTCFormat(message.CompanyMatchAttrib),
            WTCFormat(message.RecordState) || 'Missing',
            message.RefTierMessageID || 'Missing',
            message.MessageID || 'Missing',
            message.Symbol || 'Missing',
            message.MessageID|| 'Missing',
            formatShares(message.IOIShares) || 'Missing',
            WTCFormat(message.Side) || 'Missing',
            removeMilliseconds(message.CompletionTime) || 'Missing',
            message.RefHoldingsCompany,
            '<div class="badge-news fs-10 badge-tj-success"><span class="fw-bold">READ</span></div>'
        ]).draw(false);
        // table.order([10, 'desc']).draw();
    }

    function handleSingleMessage(message) {
        var compositeKey;

        // // Removes the ALERTIOI before the row is created 
        if (message.rowId && message.rowId.toString().includes('_ALERTIOI')) {
            message.type = 'ALERTIOI';
            console.log(`Current rowId: ${message.rowId}`);
            message.rowId = message.rowId.replace('_ALERTIOI', '');
            console.log(`Alert IOI Detected, Added message type: ${message.type}`);
        }
        
    
        if (!message.RefTierMessageID) {
            compositeKey = message.rowId;
        } else {
            compositeKey = message.MessageID + '_' + message.RefTierMessageID;
        }

        console.log(`Handling single message with compositeKey: ${compositeKey} and MsgType: ${message.MsgType}`);
        
        var row = table.row('#row-' + compositeKey);  
        if (row.length) {
            if (message.MsgType === 'Alert') {
                updateAlertMessage(message, row, compositeKey);
            } else {
                //console.log(`Adding details for ${message.MsgType} and ${message.database}`);
                addDetails(message, message.MsgType, message.database);
            }
        } else {
            if (message.MsgType === 'Alert') {
                addAlertMessage(message);
            } else {
                //console.log(`Adding details for ${message.MsgType} and ${message.database}`);
                addDetails(message, message.MsgType, message.database);
            }
        }
    }

    function handleMessage(event) {
        if (event.data.length > 0) {
            var messages = JSON.parse(event.data);
            console.log('Received messages:', messages);

            // --- LokiJS: Save messages to DB ---
            if (Array.isArray(messages)) {
                messages.forEach(msg => {
                    messagesCollection.insert(msg);
                    upsertIndexedDbMessage(msg);
                });
            } else {
                messagesCollection.insert(messages);
                upsertIndexedDbMessage(messages);
            }
            // -----------------------------------

            if (Array.isArray(messages)) {
                console.log('Handling array message');
                messages.forEach(handleSingleMessage);
            } else {
                console.log('Handling single message');
                handleSingleMessage(messages);
            }
        }
    }

    function ackAlert(compositeKey, RecordState, RefTierMessageID) {
        const ackMessage = {
            action: 'UPDATE',
            context: 'alerts',
            messageId: compositeKey.split('_')[0],
            RefTierMessageID: RefTierMessageID
        };

        if (RecordState.includes('Acknowledged')) {
            console.log('Alert already Acknowledged.');
        } else {            
            console.log(`Acknowledging alert for compositeKey: ${compositeKey} with RecordState: ${RecordState}. JSON Sent: ${ackMessage}`);
            console.log(`Sending Alert Ack: ${JSON.stringify(ackMessage)}`);
            window.chrome.webview.postMessage(JSON.stringify(ackMessage));
        }
    }

    $('#messagesTable tbody').on('click', 'td.details-control', function() {
        var tr = $(this).closest('tr');
        var row = table.row(tr);
        var compositeKey = row.data()[1];
        var reason = row.data()[3];
        var RecordState = row.data()[4];
        var RefTierMessageID = row.data()[5];
        var Symbol = row.data()[7];
        var side = row.data()[10];
        var holdingsID = row.data()[12];
               
        if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass('shown');

        } else {
            //Acknowledges the alert
            ackAlert(compositeKey, RecordState, RefTierMessageID);

            ///Retrieves the IOI that generated the Alert
            console.log(`Sending request for ALERTED IOI for ${compositeKey.split('_')[0]}`);
            const receivedMessage = new PostMessage(compositeKey, 'IOI');
            window.chrome.webview.postMessage(receivedMessage.retrieveMatchIoiById());

           // Options are 13F, I, H, O, IH for now
            if (reason.includes('I-CROSS')) {
                console.log(`Initiation processing request for - INTRADAY IOI - for ${Symbol}`);
                const receivedMessage = new PostMessage(compositeKey, 'IOI', side, Symbol);
                window.chrome.webview.postMessage(receivedMessage.retrieveIntradayIOIDetail());
            }

            if (reason.includes('13F')) {
                console.log(`Initiation processing request for - HOLDINGS - for ${Symbol} `);
                const receivedMessage = new PostMessage(compositeKey, 'HOLDINGS', side, Symbol, holdingsID);
                window.chrome.webview.postMessage(receivedMessage.retrieveHoldingsDetail());
            } 
            
            if (reason.includes('O-CROSS')) {
                console.log(`Initiation processing request for - INTRADAY ORDER - for ${Symbol} `);
                const receivedMessage = new PostMessage(compositeKey, 'FSMDCOrder', side, Symbol, holdingsID);
                window.chrome.webview.postMessage(receivedMessage.retrieveOrderDetail());
            }
            if (reason.includes('O-HIST')) {
                console.log(`Initiation processin request for - HISTORICAL ORDER - for ${Symbol}, side: ${side}, compositekey: ${compositeKey}`);
                const receivedMessage = new PostMessage(compositeKey, 'HIST', side, Symbol);
                window.chrome.webview.postMessage(receivedMessage.retrieveHistoryORderDetail());
            }
            if (reason.includes('I-HIST')) {
                console.log(`Initiation processing for - HISTORICAL IOI - for ${Symbol}, side: ${side}, compositekey: ${compositeKey}`);
                const receivedMessage = new PostMessage(compositeKey, 'HIST', side, Symbol);
                window.chrome.webview.postMessage(receivedMessage.retrieveHistoryIOIDetail());
            } 
        }
    });

    $('#messagesTable tbody').on('click', '.badge-link', function() {
        let tr = $(this).closest('tr');
        let row = table.row(tr);
        let rowClient = row.data()[2];
        let rowSymbol = row.data()[7];        

        console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
        const salesDashboard = new PostMessage(null, rowClient, null, rowSymbol, null);
        window.chrome.webview.postMessage(salesDashboard.openFilteredDashboard());        
        
    });

    $('#messagesTable tbody').on('click', '.badge-news', function() {
        let tr = $(this).closest('tr');
        let row = table.row(tr);
        let rowClient = row.data()[2];
        let rowSymbol = row.data()[7];        

        console.info(`Opening news ${rowClient} and ${rowSymbol} `);
        const newsDashboard = new PostMessage(null, null, null, rowSymbol, null);
        window.chrome.webview.postMessage(newsDashboard.loadFilteredNews());        
        
    });

    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.addEventListener('message', handleMessage);
    } else {
        console.error("WebView2 environment not detected.");
    }
});
