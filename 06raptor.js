// Initialize LokiJS database and collection for messages
var db = new loki('messages.db');
var messagesCollection = db.addCollection('messages');

// IndexedDB helpers
const WTC_DB_NAME = 'WTCAlertsDB';
const WTC_STORE_NAME = 'messages';
let indexedDb;

function initializeApp() {
    console.log("Page and all resources fully loaded");
    const postObj = new PostMessage(null, null, null, null, null);
    SendMessage(postObj.initRequest());

    SendMessage(postObj.listAlerts());

    SendMessage(postObj.initAlerts());
}

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

let clientVersion = undefined;
let clientUser = undefined;

function ValidateRequestFromRaptor(message) {
    if (message.id === undefined) {
        console.error(`Raptor Request missing id.` + message);
        return false;
    } else if (message.timestamp === undefined) {
        console.error(`Raptor Request missing timestamp.` + message);
        return false;
    } else if (message.method === undefined) {
        console.error(`Raptor Request missing method.` + message);
        return false;
    } else if (message.params === undefined) {
        console.error(`Raptor Request missing params.` + message);
        return false;
    }
    if (Array.isArray(message.params))// params is array
    {
        message.params.forEach(element => {
            if (element.domain === undefined) {
                console.error(`Raptor Request missing domain from param array.` + message);
                return false;
            }
        });
    }
    else // params is object
    {
        if (message.params.domain === undefined) {
            console.error(`Raptor Request missing params domain.` + message);
            return false;
        }
    }
    return true;
}

function ValidateResponseFromRaptor(message) {
    if (message.id === undefined) {
        console.error(`Raptor Response missing id.` + message);
        return false;
    } else if (message.timestamp === undefined) {
        console.error(`Raptor Response missing timestamp.` + message);
        return false;
    } else if (message.status === undefined) {
        console.error(`Raptor Response missing status.` + message);
        return false;
    } else if (message.params === undefined) {
        console.error(`Raptor Response missing params.` + message);
        return false;
    }
    if (Array.isArray(message.params))// params is array
    {
        message.params.forEach(element => {
            if (element.domain === undefined) {
                console.error(`Raptor Response missing domain from param array.` + message);
                return false;
            }
        });
    }
    else // params is object
    {
        if (message.params.domain === undefined) {
            console.error(`Raptor Response missing params domain.` + message);
            return false;
        }
    }
    return true;
}

$(document).ready(
    function () {
        // Access row cells using this enum
        const tableCols = {
            ARROWBTN: 0,
            ID: 1,
            CLIENT: 2,
            REASON: 3,
            STATUS: 4,
            REFTIERMESSAGEID: 5,
            REFMESSAGEID: 6,
            IOISYMBOL: 7,
            MESSAGEID: 8,
            IOISHARES: 9,
            SIDE: 10,
            WHEN: 11,
            UTCDATETIME: 12,
            HOLDINGSID: 13,
            NEWS: 14
        };
        const debugTable = false;

        let table = $('#messagesTable').DataTable({
            responsive: true,
            //scrollY: '600px',
            scrollCollapse: true,
            columnDefs: [
                {
                    className: 'details-control',
                    orderable: false,
                    data: null,
                    defaultContent: '',
                    targets: tableCols.ARROWBTN
                },
                {
                    name: 'compositeID',
                    targets: tableCols.ID,
                    visible: debugTable
                },
                {
                    name: 'Reason',
                    targets: tableCols.REASON,
                    width: '230px'
                },
                {
                    name: 'RefTierMessageID',
                    targets: tableCols.REFTIERMESSAGEID,
                    visible: debugTable
                },
                {
                    name: 'MessageID',
                    targets: tableCols.REFMESSAGEID,
                    visible: debugTable
                },
                {
                    targets: tableCols.MESSAGEID,
                    visible: debugTable
                },
                {
                    targets: tableCols.UTCDATETIME,
                    visible: debugTable
                },
                {
                    targets: tableCols.HOLDINGSID,
                    visible: debugTable
                }
            ],
            order: [[tableCols.UTCDATETIME, 'desc']]
        });

        let tableH = $('#messagesTableHistoric').DataTable({
            responsive: true,
            columnDefs: [
                {
                    className: 'details-control',
                    orderable: false,
                    data: null,
                    defaultContent: '',
                    targets: tableCols.ARROWBTN
                },
                {
                    name: 'compositeID',
                    targets: tableCols.ID,
                    visible: debugTable
                },
                {
                    name: 'Reason',
                    targets: tableCols.REASON,
                    width: '230px'
                },
                {
                    name: 'RefTierMessageID',
                    targets: tableCols.REFTIERMESSAGEID,
                    visible: debugTable
                },
                {
                    name: 'MessageID',
                    targets: tableCols.REFMESSAGEID,
                    visible: debugTable
                },
                {
                    targets: tableCols.MESSAGEID,
                    visible: debugTable
                },
                {
                    targets: tableCols.UTCDATETIME,
                    visible: debugTable
                },
                {
                    targets: tableCols.HOLDINGSID,
                    visible: debugTable
                }
            ],
            order: [[tableCols.UTCDATETIME, 'desc']]
        });

        function formatPrice(price) {
            let userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined

            return isNaN(price) ? price : new Intl.NumberFormat(userLocale, {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(price);
        }

        function formatNumber(number) {
            let userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined
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

                let userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined
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

        // NOT USED
        //        function loadSalesDashboard(event){
        //            let tr = $(this).closest('tr');
        //            let row = table.row(tr);
        //            let rowClient = row.data()[2];
        //            let rowSymbol = row.data()[7];
        //
        //            
        //            console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
        //            const getDashboard = new PostMessage({ type: rowClient, Symbol: rowSymbol });
        //            SendMessage(receivedMessage.openFilteredDashboard());
        //            
        //            
        //        }

        // NOT USED
        //        function loadNews(event){
        //            let tr = $(this).closest('tr');
        //            let row = table.row(tr);
        //            let rowClient = row.data()[2];
        //            let rowSymbol = row.data()[7];
        //
        //            
        //            console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
        //            const getDashboard = new PostMessage({ type: rowClient, Symbol: rowSymbol });
        //            SendMessage(receivedMessage.openFilteredDashboard());
        //            
        //            
        //        }

        function sideTendency(number) {
            if (number > 0) {
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
            } else if (singleField === 'Acknowledged' || singleField === 'acknowledged') {
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

        function fistUserName(field) {
            if (typeof field === 'string' && field.includes(',')) {
                return firstValue = field.split(',')[0];
            } else {
                return field;
            }
        }

        function removeMilliseconds(field) {
            let noMili = field.split('.')[0];
            return noMili;
        }

        function addAlertMessage(message, params, historic, utcCompletionDateTime, lclCompletionTime) {
            console.log(`Adding Alert Row:` + message.id);
            if (!historic) {
                table.row.add([
                    '',                                                                                     // 0 - <button>
                    message.id,                                                                             // 1 - MessageID_RefTierMessageID
                    params.companyalias,                                                                    // 2 - Client
                    Array.isArray(params.companymatchattrib)                                                // 3 - Reason
                        ? params.companymatchattrib.map(WTCFormat).join(' ')
                        : WTCFormat(params.companymatchattrib),
                    WTCFormat(params.recordstate) || 'Missing',                                             // 4 - Alert Status
                    params.reftiermessageid || 'Missing',                                                   // 5 - RefTierMessageID
                    params.messageid || 'Missing',                                                          // 6 - RefMessageID
                    params.symbol || 'Missing',                                                             // 7 - IOISymbol
                    params.messageid || 'Missing',                                                          // 8 - MessageID
                    formatShares(params.ioishares) || 'Missing',                                            // 9 - IOIShares
                    WTCFormat(params.side) || 'Missing',                                                    // 10- Opportunity
                    lclCompletionTime || 'Missing',                                                         // 11- When
                    utcCompletionDateTime || 'Missing',                                                     // 12- hidden datetime for ordering
                    params.holdingsrefaccountid || 'Missing',                                               // 13- HoldingsRefAccountID
                    '<div class="badge-news fs-10 badge-tj-success"><span class="fw-bold">READ</span></div>'// 14- News
                ]).node().id = 'row-' + message.id;
                table.draw();
            } else {
                tableH.row.add([
                    '',                                                                                     // 0 - <button>
                    message.id,                                                                             // 1 - MessageID_RefTierMessageID
                    params.companyalias,                                                                    // 2 - Client
                    Array.isArray(params.companymatchattrib)                                                // 3 - Reason
                        ? params.companymatchattrib.map(WTCFormat).join(' ')
                        : WTCFormat(params.companymatchattrib),
                    WTCFormat(params.recordstate) || 'Missing',                                             // 4 - Alert Status
                    params.reftiermessageid || 'Missing',                                                   // 5 - RefTierMessageID
                    params.messageid || 'Missing',                                                          // 6 - RefMessageID
                    params.symbol || 'Missing',                                                             // 7 - IOISymbol
                    params.messageid || 'Missing',                                                          // 8 - MessageID
                    formatShares(params.ioishares) || 'Missing',                                            // 9 - IOIShares
                    WTCFormat(params.side) || 'Missing',                                                    // 10- Opportunity
                    lclCompletionTime || 'Missing',                                                         // 11- When
                    utcCompletionDateTime || 'Missing',                                                     // 12- hidden datetime for ordering
                    params.holdingsrefaccountid || 'Missing',                                               // 13- HoldingsRefAccountID
                    '<div class="badge-news fs-10 badge-tj-success"><span class="fw-bold">READ</span></div>'// 14- News
                ]).node().id = 'row-' + message.id;
                tableH.draw();
            }

        }

        function updateAlertMessage(message, params, lclCompletionTime, row) {
            console.log(`Updating Alert Row:` + message.id);
            //console.log(row.data());
            let rowData = row.data();
            rowData[tableCols.STATUS] = WTCFormat(params.recordstate) || 'Missing';
            rowData[tableCols.WHEN] = lclCompletionTime || 'Missing';
            row.data(rowData).draw(false);
        }

        const MsgType = {
            ALERT: 'Alert'
            , IOI: 'IOI'
            , FSMDCORDER: 'FSMDCOrder'
            , FSMINORDER: 'FSMInOrder'
            , HOLDINGSDATA: 'HoldingsData'
        };

        function addNoDataDetails(compositeKey, params, row) {
            if (params.domain === Domain.ALERT) {
            } else if (params.domain === Domain.IOI) {
            } else if (params.domain === Domain.ORDER) {
            } else if (params.domain === Domain.HISTORY) {
            } else if (params.domain === MsgType.HOLDINGSDATA) {
            } else {
                console.error(`Unhandled MsgType ${params.msgtype} for getFormattedDetails()`);
            }
            if (!row.child.isShown()) {
                console.log("SHOW");
                let tr = $(row.node());
                let childContent = `<tr><td>NO DATA</td></tr>`
                row.child(childContent).show();
                tr.addClass('shown');
            }
        }

        function addResponseDetails(id, params, utcCompletionDateTime, lclCompletionTime, row) {
            let compositeKey = id;// || (params.messageid + '_' + params.reftiermessageid);
            if (row.length) {
                console.log(`Updating row: ${compositeKey} MsgType: ${params.msgtype}`);
                let holdingsDetails = '';
                let ioiDetails = '';
                let orderDetails = '';
                let histDetails = '';
                let alertIOIDetails = '';

                //Details for IOI that generated the Alert
                if (params.msgtype === MsgType.ALERT) {
                    alertIOIDetails = getFormattedDetails_ALERTIOI(params, utcCompletionDateTime, lclCompletionTime);
                }
                else if (params.msgtype === MsgType.IOI) {
                    //console.log('It did find domain = IOI');
                    ioiDetails = getFormattedDetails_IIOI(params, utcCompletionDateTime, lclCompletionTime);
                }
                // Details for INTRADAY Order & Historical Order
                else if (params.msgtype === MsgType.FSMDCORDER || params.msgtype === MsgType.FSMINORDER) {
                    if (params.domain === Domain.ORDER)
                        orderDetails = getFormattedDetails_INTRADAYORDER(params, utcCompletionDateTime, lclCompletionTime);
                    else if (params.domain === Domain.HISTORY)
                        histDetails = getFormattedDetails_HISTORICALORDER(params, utcCompletionDateTime, lclCompletionTime);
                    else
                        console.warn(`Unhandled MsgType ${params.msgtype} for getFormattedDetails()`);
                }
                //Details for Holdings Data
                else if (params.msgtype === MsgType.HOLDINGSDATA) {
                    holdingsDetails = getFormattedDetails_HOLDINGS(params, utcCompletionDateTime, lclCompletionTime);
                }
                else {
                    console.warn(`Unhandled MsgType ${params.msgtype} for getFormattedDetails()`);
                }

                if (!row.child.isShown()) {
                    console.log("SHOW");
                    //var curScrollTop = $(window).scrollTop();
                    //$('html').toggleClass('noscroll').css('top', '-' + curScrollTop + 'px');

                    let tr = $(row.node());
                    // Show drop down for row
                    let childContent = `
                            <tr>
                                <td style="vertical-align: top;" id="alert-${compositeKey}">${alertIOIDetails}</td>    
                                <td style="vertical-align: top;" id="orders-${compositeKey}">${orderDetails}</td>
                                <td style="vertical-align: top;" id="hist-${compositeKey}">${histDetails}</td>
                                <td style="vertical-align: top;" id="ioi-${compositeKey}">${ioiDetails}</td>
                                <td style="vertical-align: top;" id="holdings-${compositeKey}">${holdingsDetails}</td>
                            </tr>
                    `;
                    if (alertIOIDetails === '' && orderDetails === '' && histDetails === '' && ioiDetails === '' && holdingsDetails === '')
                        childContent = `<tr>NO DATA</tr>`
                    row.child(childContent).show();
                    tr.addClass('shown');
                    //$('html').toggleClass('noscroll');
                } else {
                    console.log("UPDATE CHILD DATA");
                    if (params.msgtype === MsgType.IOI) { // IIOI
                        $(`#ioi-${compositeKey}`).html(ioiDetails);
                    }
                    else if (params.msgtype === MsgType.FSMDCORDER || params.msgtype === MsgType.FSMINORDER) {
                        // Only update the Order cell
                        if (params.domain === Domain.ORDER)
                            $(`#orders-${compositeKey}`).html(orderDetails); // INTRADAYORDER
                        if (params.domain === Domain.HISTORY)
                            $(`#hist-${compositeKey}`).html(histDetails);  // HISTORICALORDER
                    }
                    // If the row is already shown, update its content separately
                    else if (params.msgtype === MsgType.HOLDINGSDATA) { // HOLDINGS
                        // Only update the Holdings cell
                        $(`#holdings-${compositeKey}`).html(holdingsDetails);
                    }
                    else if (params.msgtype == MsgType.ALERT) {
                        ;
                    }
                    else {
                        console.error(`Unhandled MsgType ${params.msgtype} for pageopen`);
                    }
                    // if (params.msgtype === 'IOI') {
                    //     $(`#alert-${compositeKey}`).html(alertIOIDetails);
                    // }
                }
            } else {
                console.error(`Row not found for compositeKey: ${compositeKey}`);
            }
        }

        function calcPercentage(a, b) {

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

        function findCommonElement(arr1, arr2) {
            const txt = arr1.find(element => arr2.includes(element));
            //console.log(`DATA: ${arr1} & ${arr2} = ${txt}`);
            return txt;
        }
        function findIOIAttrib(ioiattrib, list) {
            if (ioiattrib !== undefined) {
                list.forEach(element => {
                    const idx = ioiattrib.indexof(element);
                    if (idx != -1)
                        return element;
                });
            }
            return 'Missing';
        }

        function getFormattedDetails_ALERTIOI(params, utcCompletionDateTime, lclCompletionTime) {
            console.log('LAYOUT: ALERTIOI');
            const fields = ['Received IOI', 'Time', 'Symbol', 'Price', 'Side', 'IOIShares', 'User'];
            const aArgs = ['AutoGenerated', 'OwnerMine'];
            const selectedData = {
                'Received IOI': findCommonElement(params.ioiattrib, aArgs),
                Time: lclCompletionTime || 'Missing',
                Symbol: params.symbol + ` (${params.exdestination})` || 'Missing',
                Price: (params.ordtype === 'Market') ? params.ordtype : formatPrice(params.reforderprice) || 'Market',
                Side: fullSide(params.side) || 'Missing',
                IOIShares: formatShares(params.ioishares) || 'Missing',
                User: fistUserName(params.sourcelogonname) || 'Missing',
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
                        <li>
                            <span style="font-weight: bold; color: #fff;">User:</span>
                            <span style="margin-left: 8px;">${selectedData['User']}</span>
                        </li>
                    </ul>
                </div>
                `;
            return formattedDetails;
        }
        function getFormattedDetails_IIOI(params, utcCompletionDateTime, lclCompletionTime) {
            console.log('LAYOUT: IIOI');
            const fields = ['Type', 'Time', 'Symbol', 'Price', 'Side', 'IOIShares', 'User'];
            const selectedData = {
                Type: 'Intraday IOI' || 'Missing',
                Time: lclCompletionTime || 'Missing',
                Symbol: params.symbol + ` (${params.exdestination})` || 'Missing',
                Price: (params.ordtype === 'Market') ? params.ordtype : formatPrice(params.reforderprice) || 'Market',
                Side: fullSide(params.side) || 'Missing',
                IOIShares: formatShares(params.ioishares) || 'Missing',
                User: fistUserName(params.sourcelogonname) || 'Missing',
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
            return formattedDetails;
        }
        function getFormattedDetails_INTRADAYORDER(params, utcCompletionDateTime, lclCompletionTime) {
            console.log('LAYOUT: INTRADAYORDER');
            const fields = ['Type', 'Time', 'Symbol', 'Qty (avai/exec)', 'Price', 'Side', 'User'];
            const selectedData = {
                Type: 'Order',
                Time: lclCompletionTime || 'Missing',
                Symbol: params.symbol + ` (${params.raiexchangeid})` || 'Missing',
                Price: ((params.avgpx === '0') ? formatPrice(params.avgpx) : 'Market') || 'Missing',
                'Qty (avai/exec)': (formatShares(params.availqty) + ' / ' + formatShares(params.cumqty) + ' (' + calcPercentage(params.cumqty, params.availqty) + '%)') || 'Missing',
                Side: fullSide(params.side) || 'Missing',
                User: fistUserName(params.sourcelogonname) || 'Missing'
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
            return formattedDetails;
        }
        function getFormattedDetails_HISTORICALORDER(params, utcCompletionDateTime, lclCompletionTime) {
            console.log('LAYOUT: HISTORICALORDER');
            const fields = ['Type', 'Time', 'Symbol', 'Qty (avai/exec)', 'Price', 'Side', 'User'];
            const selectedData = {
                Type: 'Historical Order' + ` (${params.msgtype})`,
                Time: lclCompletionTime || 'Missing',
                Symbol: params.symbol + ` (${params.raiexchangeid})` || 'Missing',
                Price: ((params.avgpx === '0') ? formatPrice(params.avgpx) : 'Market') || 'Missing',
                'Qty (avai/exec)': (formatShares(params.orderqty) + ' / ' + formatShares(params.cumqty) + ' (' + calcPercentage(params.cumqty, params.orderqty) + '%)') || 'Missing',
                Side: fullSide(params.side) || 'Missing',
                User: fistUserName(params.sourcelogonname) || 'Missing'
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
            return formattedDetails;
        }
        function getFormattedDetails_HOLDINGS(params, utcCompletionDateTime, lclCompletionTime) {
            console.log('LAYOUT: HOLDINGS');
            const fields = ['Type', 'Symbol', 'Exchange', 'Account', 'Shares Held', '% held', 'Delta Shares', 'Filing Date'];
            const selectedData = {
                Type: params.msgtype || 'Missing',
                Symbol: params.symbol || 'Missing',
                Exchange: params.exchange || 'Missing',
                Account: params.holdingsaccount || 'Missing',
                'Shares Held': formatNumber(params.holdingssharesheld) || 'Missing',
                '% held': numberToPercentage(params.holdingspercentheld) || 'Missing',
                'Delta Shares': formatShares(params.holdingssharesdelta) + sideTendency(params.holdingssharesdelta) || 'Missing',
                'Filing Date': params.holdingsdate || 'Missing'
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
            return formattedDetails;
        }

        function handleSingleMessage(message) {
            let compositeKey;

            if (message.method !== undefined) { // Request/Instruction from Raptor to the WebView page

                if (ValidateRequestFromRaptor(message) === false) {
                    console.error(`ERROR: Invalid message received: ${JSON.stringify(message)}`);
                    return;
                }
                console.log('Received valid instruction/request message from Raptor');
                console.error(`REQUESTS HANDLED AT LATER DATE FOR THINGS SUCH AS SERVER DISCONNECT`);
            } else { // Response from Raptor for request from WebView page            
                if (ValidateResponseFromRaptor(message) === false) {
                    console.error(`ERROR: Invalid message received: ${JSON.stringify(message)}`);
                    return;
                }
                console.log('Received valid response message from Raptor');

                if (message.status && message.status === 'error') {
                    console.error(`ERROR: Status response from Raptor: ${JSON.stringify(message)}`);
                    return;
                }
                else if (message.status && message.status === 'warning') {
                    console.error(`WARNING: Status response from Raptor: ${JSON.stringify(message)}`);
                    return;
                }

                if (Array.isArray(message.params)) {
                    console.log(`Processing param array`);
                    message.params.forEach(element => {
                        processResponseFromRaptor(message, element); // Directly access the element
                    });
                } else {
                    processResponseFromRaptor(message, message.params);
                }
            }
        }


        function processResponseFromRaptor(message, params) {
            console.log(`Params Domain:${params.domain} DomainRef:${params.domainRef}`);

            let historic = false;
            let compositeKey = message.id;
            const parts = compositeKey.split('_');
            if (parts[2] === 'H') { // Response Ids from the Historical tab
                historic = true;
                compositeKey = `${parts[0]}_${parts[1]}`;
            }
            //console.log(`ROW ID:${compositeKey}`);
            let utcCompletionDateTime = undefined;
            let lclCompletionTime = undefined;
            if (params.completiontime !== undefined) {
                utcCompletionDateTime = fixDateTimeToJSDate(params.completiontime);
                lclCompletionDateTime = new Date(utcCompletionDateTime);
                if (lclCompletionDateTime < getLclToday()) // Initial messages wont have _H on the id, so check completion time
                    historic = true;
                lclCompletionTime = removeMilliseconds(historic ? getLclDateTime(new Date(lclCompletionDateTime)) : getLclTime(new Date(lclCompletionDateTime)));
            }

            let row = historic ? tableH.row('#row-' + compositeKey) : table.row('#row-' + compositeKey);
            if (params.domain === Domain.ALERT && params.domainRef === DomainRef.WTC) {
                console.log(`WTC Alert`);
                if (message.code !== undefined && message.code === 204 && message.status === 'success') // NoContent
                {
                    console.error(`Query yields no results:${message.message}`);
                    return;
                }
                if (params.recordstate !== undefined && params.recordstate === 'acknowledged') {
                    if (row.length) {
                        updateAlertMessage(message, params, lclCompletionTime, row);
                    } else if (params.resend !== undefined && params.resend === 'yes') {
                        addAlertMessage(message, params, historic, utcCompletionDateTime, lclCompletionTime);
                    } else {
                        console.error(`Update for non existent row ${row}`);
                    }
                    return;
                }
                if (params.msgtype === undefined) {
                    console.error(`NO MsgType!!:${message.message}`);
                    return;
                }

                if (row.length) {
                    addResponseDetails(compositeKey, params, utcCompletionDateTime, lclCompletionTime, row);
                } else {
                    addAlertMessage(message, params, historic, utcCompletionDateTime, lclCompletionTime);
                    if (params.resend !== undefined && params.resend === 'no') {
                        row = historic ? tableH.row('#row-' + compositeKey) : table.row('#row-' + compositeKey);
                        addResponseDetails(compositeKey, params, utcCompletionDateTime, lclCompletionTime, row);
                    }
                }
            } else if (params.domain === Domain.ALERT) { // but response to a request, not a wtc gemerated alert
                console.log(`Alert response`);
            } else if (params.domain === Domain.SYSTEM) {
                console.log(`System response`);
                if (params.domainRef === DomainRef.VERSION) {
                    document.title = `Quick Who-To-Call v${params.version} Usr:${params.name} | O-HIST = Historical Order | 13F = Holdings Data | I-CROSS = Intraday IOIs  | O-CROSS = Intraday Order`
                    if (params.qalogging !== undefined && params.qalogging === "yes")
                        qaLogging = true;
                    else
                        qaLogging = false;

                    if (params.loglevel == 'debug')
                        clientLogLevel = LogLevel.DEBUG;
                    else if (params.loglevel == 'error')
                        clientLogLevel = LogLevel.ERROR;
                    else if (params.loglevel == 'warning')
                        clientLogLevel = LogLevel.WARNING;
                    else if (params.loglevel == 'info')
                        clientLogLevel = LogLevel.INFO;
                    else
                        clientLogLevel = LogLevel.NONE;   
                }
            } else if (params.domain === Domain.ORDER) {
                console.log(`Order response`);
                if (params.msgtype === undefined) {
                    console.warn(`NO DATA:${message.message}`);
                    addNoDataDetails(compositeKey, params, row);
                    return;
                }
                addResponseDetails(compositeKey, params, utcCompletionDateTime, lclCompletionTime, row);
            } else if (params.domain === Domain.HISTORY) {
                console.log(`History response`);
                if (params.msgtype === undefined) {
                    console.warn(`NO DATA:${message.message}`);
                    addNoDataDetails(compositeKey, params, row);
                    return;
                }
                addResponseDetails(compositeKey, params, utcCompletionDateTime, lclCompletionTime, row);
            } else if (params.domain === Domain.IOI) {
                console.log(`IOI response`);
                if (params.msgtype === undefined) {
                    console.warn(`NO DATA:${message.message}`);
                    addNoDataDetails(compositeKey, params, row);
                    return;
                }
                addResponseDetails(compositeKey, params, utcCompletionDateTime, lclCompletionTime, row);
            } else if (params.domain === Domain.GUI) {
                console.log(`GUI response`);
            } else {
                console.error(`Domain not handled:` + params.domain);
            }
        }

        // Entry point for message in from Raptor
        function handleMessage(event) {
            if (event.data.length > 0) {
                let messages = JSON.parse(event.data);
                console.log(`\n[${getLclTime()}]`);

                // --- LokiJS: Save messages to DB ---
                if (Array.isArray(messages)) {
                    messages.forEach(msg => {
                        console.info(`[${getLclTime()}] Rcv: ${JSON.stringify(msg)}`);
                        messagesCollection.insert(msg);
                        upsertIndexedDbMessage(msg);
                        handleSingleMessage(msg)
                    });
                } else {
                    console.info(`[${getLclTime()}] Rcv: ${JSON.stringify(messages)}`);
                    messagesCollection.insert(messages);
                    upsertIndexedDbMessage(messages);
                    handleSingleMessage(messages)
                }
            }
        }

        // Acknowledge receipt of message from RaptorClient
        //        function ackMsg(compositeKey, params) {
        //            const _params = {
        //                domain: params.domain,
        //                domainRef: params.domainRef,
        //            };
        //            const ackMessage = AddRequiredResponseKeys(undefined, 'success', 'ack', _params);
        //            console.log(`Acknowledging compositeKey: ${compositeKey}`);
        //            SendMessage(ackMessage);
        //        }

        // User Acknowledgement of WTC alert from RaptorClient
        function userAckAlert(compositeKey, RecordState) {//, RefTierMessageID) {
            const parts = compositeKey.toString().split('_');
            const _params = {
                domain: 'alert',
                domainRef: 'wtc',
                refmessageid: parts[0],
                reftiermessageid: parts[1]
                //messageId: compositeKey.split('_')[0],
                //RefTierMessageID: RefTierMessageID
            };
            const userAckMessage = AddRequiredRequestKeys(compositeKey, 'PUT', _params);
            if (RecordState.includes('Acknowledged')) {
                console.log('Alert already Acknowledged.');
            } else {
                console.log(`User Acknowledging alert for compositeKey: ${compositeKey} with RecordState: ${RecordState}`);
                SendMessage(userAckMessage);
            }
        }

        $('#messagesTableHistoric tbody').on('click', 'td.details-control', function () {
            let tr = $(this).closest('tr');
            let row = tableH.row(tr);
            let compositeKey = row.data()[tableCols.ID];
            let reason = row.data()[tableCols.REASON];
            let RecordState = row.data()[tableCols.STATUS];
            let RefTierMessageID = row.data()[tableCols.REFTIERMESSAGEID];
            let Symbol = row.data()[tableCols.IOISYMBOL];
            let side = row.data()[tableCols.SIDE];
            let holdingsID = row.data()[tableCols.HOLDINGSID];
            console.log(`ROW:${row.data()}`);
            if (row.child.isShown()) {
                console.log("HIDE");                
                row.child.hide();
                tr.removeClass('shown');
            }
            else {
                //User acknowledges the alert
                //userAckAlert(compositeKey, RecordState);//, RefTierMessageID);

                ///Retrieves the IOI that generated the Alert
                //console.log(`Sending request for ALERTED IOI for ${compositeKey.split('_')[0]}`);
                const postObj = new PostMessage(`${compositeKey}_H`, 'IOI');
                SendMessage(postObj.retrieveMatchIoiById());

                // Send out a bunch or requests based on the reason
                // Options are 13F, I, H, O, IH for now
                if (reason.includes('I-CROSS')) {
                    const postObj = new PostMessage(`${compositeKey}_H`, 'IOI', side, Symbol);
                    SendMessage(postObj.retrieveIntradayIOIDetail());
                }
                if (reason.includes('13F')) {
                    const postObj = new PostMessage(`${compositeKey}_H`, 'HOLDINGS', side, Symbol, holdingsID);
                    SendMessage(postObj.retrieveHoldingsDetail());
                }
                if (reason.includes('O-CROSS')) {
                    const postObj = new PostMessage(`${compositeKey}_H`, 'FSMDCOrder', side, Symbol, holdingsID);
                    SendMessage(postObj.retrieveOrderDetail());
                }
                if (reason.includes('O-HIST')) {
                    const postObj = new PostMessage(`${compositeKey}_H`, 'HIST', side, Symbol);
                    SendMessage(postObj.retrieveHistoryORderDetail());
                }
                if (reason.includes('I-HIST')) {
                    const postObj = new PostMessage(`${compositeKey}_H`, 'HIST', side, Symbol);
                    SendMessage(postObj.retrieveHistoryIOIDetail());
                }
            }
        })

        // User clicked on blue arrow to drop down details of alert
        $('#messagesTable tbody').on('click', 'td.details-control', function () {
            let tr = $(this).closest('tr');
            let row = table.row(tr);
            let compositeKey = row.data()[tableCols.ID];
            let reason = row.data()[tableCols.REASON];
            let RecordState = row.data()[tableCols.STATUS];
            let RefTierMessageID = row.data()[tableCols.REFTIERMESSAGEID];
            let Symbol = row.data()[tableCols.IOISYMBOL];
            let side = row.data()[tableCols.SIDE];
            let holdingsID = row.data()[tableCols.HOLDINGSID];
            console.log(`ROW:${row.data()}`);
            let bRunLookups = false;
            if (row.child.isShown()) {
                //let childRowElement = row.child(); // child row's DOM element
                //if (childRowElement.length > 0) {
                //    let elementToUpdate = childRowElement.find(`#alert-${compositeKey}`)[0];
                //    if (elementToUpdate !== undefined) {
                //        //let txt = childRowElement.text();
                //        let myId = elementToUpdate.id;
                //        if (document.getElementById(myId).getElementsByTagName('div')[0] !== undefined) {
                //            const computedStyle = window.getComputedStyle(document.getElementById(myId).getElementsByTagName('div')[0], "")
                //            let clr = computedStyle.borderColor;
                //            //console.log(`MYID:${myId}`);
                //            //console.log(`DATA:${txt}`);
                //            //console.log(`COLR:${clr}`);
                //            let myOrange = { r: 255, g: 165, b: 0 };
                //            let myColor = rgbToObj(clr);
                //            //console.log(`OBJ:${JSON.stringify(myColor)}`);
                //            if (areColorsEqual(myColor, myOrange)) {
                //                //console.log(`Found ORANGE`);
                //                //User acknowledges the alert
                //                bRunLookups = true;
                //                let childContent = `
                //                <tr>
                //                    <td style="vertical-align: top;" id="alert-${compositeKey}"></td>    
                //                    <td style="vertical-align: top;" id="orders-${compositeKey}"></td>
                //                    <td style="vertical-align: top;" id="hist-${compositeKey}"></td>
                //                    <td style="vertical-align: top;" id="ioi-${compositeKey}"></td>
                //                    <td style="vertical-align: top;" id="holdings-${compositeKey}"></td>
                //                </tr>
                //                `;
                //                row.child(childContent);
                //            } else {
                //                //console.log(`NOT ORANGE`);
                //            }
                //        }
                //    }
                //} else {
                //    console.log(`No child!`);
                //}
                if (!bRunLookups) {
                    console.log("HIDE");
                    //var curScrollTop = $(window).scrollTop();
                    //$('html').toggleClass('noscroll').css('top', '-' + curScrollTop + 'px');

                    row.child.hide();
                    tr.removeClass('shown');

                    //$('html').toggleClass('noscroll');
                }
            }
            else {
                //if (bRunLookups) {
                //User acknowledges the alert
                userAckAlert(compositeKey, RecordState);//, RefTierMessageID);

                ///Retrieves the IOI that generated the Alert
                //console.log(`Sending request for ALERTED IOI for ${compositeKey.split('_')[0]}`);
                const postObj = new PostMessage(compositeKey, 'IOI');
                SendMessage(postObj.retrieveMatchIoiById());

                // Send out a bunch or requests based on the reason
                // Options are 13F, I, H, O, IH for now
                if (reason.includes('I-CROSS')) {
                    const postObj = new PostMessage(compositeKey, 'IOI', side, Symbol);
                    SendMessage(postObj.retrieveIntradayIOIDetail());
                }
                if (reason.includes('13F')) {
                    const postObj = new PostMessage(compositeKey, 'HOLDINGS', side, Symbol, holdingsID);
                    SendMessage(postObj.retrieveHoldingsDetail());
                }
                if (reason.includes('O-CROSS')) {
                    const postObj = new PostMessage(compositeKey, 'FSMDCOrder', side, Symbol, holdingsID);
                    SendMessage(postObj.retrieveOrderDetail());
                }
                if (reason.includes('O-HIST')) {
                    const postObj = new PostMessage(compositeKey, 'HIST', side, Symbol);
                    SendMessage(postObj.retrieveHistoryORderDetail());
                }
                if (reason.includes('I-HIST')) {
                    const postObj = new PostMessage(compositeKey, 'HIST', side, Symbol);
                    SendMessage(postObj.retrieveHistoryIOIDetail());
                }
            }
        });

        // Reason column
        $('#messagesTable tbody').on('click', '.badge-link', function () {
            //console.log(`ACTION: REASON`);
            let tr = $(this).closest('tr');
            let row = table.row(tr);
            let rowClient = row.data()[tableCols.CLIENT];
            let rowSymbol = row.data()[tableCols.IOISYMBOL];
            let compositeKey = row.data()[tableCols.ID];

            console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
            const postObj = new PostMessage(compositeKey, rowClient, null, rowSymbol, null);
            SendMessage(postObj.openFilteredDashboard());

        });

        // News column
        $('#messagesTable tbody').on('click', '.badge-news', function () {
            //console.log(`ACTION: NEWS`);
            let tr = $(this).closest('tr');
            let row = table.row(tr);
            let rowClient = row.data()[tableCols.CLIENT];
            let rowSymbol = row.data()[tableCols.IOISYMBOL];
            let compositeKey = row.data()[tableCols.ID];

            console.info(`Opening news ${rowClient} and ${rowSymbol} `);
            const postObj = new PostMessage(compositeKey, null, null, rowSymbol, null);
            SendMessage(postObj.loadFilteredNews());

        });
        $('#messagesTableHistoric tbody').on('click', '.badge-news', function () {
            //console.log(`ACTION: NEWS`);
            let tr = $(this).closest('tr');
            let row = tableH.row(tr);
            let rowClient = row.data()[tableCols.CLIENT];
            let rowSymbol = row.data()[tableCols.IOISYMBOL];
            let compositeKey = row.data()[tableCols.ID];

            console.info(`Opening news ${rowClient} and ${rowSymbol} `);
            const postObj = new PostMessage(compositeKey, null, null, rowSymbol, null);
            SendMessage(postObj.loadFilteredNews());

        });

        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.addEventListener('message', handleMessage);
            initializeApp();
        } else {
            console.error("WebView2 environment not detected.");
        }

    } // end function() 
); // end $(document).ready