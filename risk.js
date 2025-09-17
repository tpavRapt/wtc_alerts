///////////////////////////////////////////////////////////////////////////////////////////////////////////
// Globals
let initialized;
let historic = false;

const tableCpyCols = {
    MESSAGEID: 0,
    COMPANYNAME: 1,
    COMPANYALIAS: 2,
    CONNECTIONSTATUS: 3,
    COMPLETIONTIME: 4,
};
let tableCpy;

const tableOrdCols = {
    MESSAGEID: 0,
    ORDSTATUS:1,
    SYMBOL: 2,
    SIDE: 3,
    ORDERQTY: 4,
    COMPLETIONTIME: 5,
};
let tableOrd;

const tableRskCols = {
    MESSAGEID: 0,
    COMPANYALIAS: 1,
    POSITIONVALUE: 2,
    PENDINGVALUE: 3,
    PENDINGLONG: 4,
    PENDINGSELL: 5,
    PENDINGSHORT: 6,
    NETTOTAL: 7,
    COMPLETIONTIME: 8,
};
let tableRsk;

const tableRskSettingsCols = {
    MESSAGEID: 0,
    COMPANYALIAS: 1,
    RMATTRIB: 2,
    BUYORDQTYLMT3: 3,
    ACTIONWHENINVIOLATION: 4,
    COMPLETIONTIME: 5,
};
let tableRskSettings;

function initializeApp() {
    console.log("Page and all resources fully loaded");
    initialized = false;
    SendMessage(msgVersionCheck());
    SendMessage(msgSubscribeCompanies());
    SendMessage(msgSubscribeOrders());
    SendMessage(msgSubscribeRisk());
    SendMessage(msgRiskPrefs());
}
//async function closingMessages() {
//    return new Promise(function(resolve, reject) {
//        SendMessage(msgSubscribeCompanies(false));
//        SendMessage(msgSubscribeOrders(false));
//        SendMessage(msgSubscribeRisk(false));
//        resolve();
//    });
//}
//window.addEventListener('beforeunload', async (event) => {
//    event.preventDefault();
//    event.returnValue = '';
//    await closingMessages();
//    console.log('Page is about to close');
//});

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// DOM setup
$(document).ready(
    function () {
        // Initalize page and JSON listener
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.addEventListener('message', handleMessage);
            initializeApp();
        } else {
            console.error("WebView2 environment not detected.");
        }

        tableCpy = $('#companyTable').DataTable({
            responsive: true
            , scrollCollapse: true
            , order: [[tableCpyCols.COMPLETIONTIME, 'desc']] // Initial sort order
            , columnDefs: [
                {
                    className: 'details-control',
                    orderable: false,
                    data: null,
                    defaultContent: '?'
                }
            ]
        });
        tableOrd = $('#orderTable').DataTable({
            responsive: true
            , scrollCollapse: true
            , order: [[tableOrdCols.COMPLETIONTIME, 'desc']] // Initial sort order
            , columnDefs: [
                {
                    className: 'details-control',
                    orderable: false,
                    data: null,
                    defaultContent: '?'
                }
            ]
        });
        tableRsk = $('#riskTable').DataTable({
            responsive: true
            , scrollCollapse: true
            , order: [[tableRskCols.COMPLETIONTIME, 'desc']] // Initial sort order
            , columnDefs: [
                {
                    className: 'details-control',
                    orderable: false,
                    data: null,
                    defaultContent: '?'
                }
            ]
        });

        tableRskSettings = $('#riskSettingsTable').DataTable({
            responsive: true
            , scrollCollapse: true
            , order: [[tableRskSettingsCols.COMPLETIONTIME, 'desc']] // Initial sort order
            , columnDefs: [
                {
                    className: 'details-control',
                    orderable: false,
                    data: null,
                    defaultContent: '?'
                }
            ]
        });

    } // end function() 
); // end $(document).ready

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// Message Definitions
function msgVersionCheck() {
    const params = {
        domain: 'system',
        domainRef: 'version',
    };
    const message = AddRequiredRequestKeys(undefined, 'GET', params);
    return message;
}

let subOrderId;
function msgSubscribeOrders(subscribe = true) {
    const params = {
        domain: 'order',
        query: 'MsgType = FSMInOrder AND TopFSMID IS NULL OR MsgType = FSMDCOrder AND FSMOrderAttrib & DropCopy = 0',
    };
    if (subscribe) {
        message = AddRequiredRequestKeys(undefined, 'SUB', params);
        subOrderId = message.id;
    } else {
        message = AddRequiredRequestKeys(subOrderId, 'UNSUB', params);
    }
    return message;
}

let subRiskId;
function msgSubscribeRisk(subscribe = true) {
    const params = {
        domain: 'risk',
    };
    if (subscribe) {
        message = AddRequiredRequestKeys(undefined, 'SUB', params);
        subRiskId = message.id;
    } else {
        message = AddRequiredRequestKeys(subRiskId, 'UNSUB', params);
    }
    return message;
}

let subCompanyId = 0;
function msgSubscribeCompanies(subscribe = true) {
    const params = {
        domain: 'company',
    };
    if (subscribe) {
        message = AddRequiredRequestKeys(undefined, 'SUB', params);
        subCompanyId = message.id;
    } else {
        message = AddRequiredRequestKeys(subCompanyId, 'UNSUB', params);
    }
    return message;
}

function msgRiskPrefs() {
    const params = {
        domain: 'risk',
    };
    const message = AddRequiredRequestKeys(undefined, 'GET', params);
    return message;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// JSON Message Handling
function handleMessage(event) {
    if (event.data.length > 0) {
        let messages = JSON.parse(event.data);
        console.log(`\n[${getLclTimeStr()}]`);

        if (Array.isArray(messages)) {
            messages.forEach(msg => {
                console.info(`[${getLclTimeStr()}] Rcv: ${JSON.stringify(msg)}`);
                handleSingleMessage(msg)
            });
        } else {
            console.info(`[${getLclTimeStr()}] Rcv: ${JSON.stringify(messages)}`);
            handleSingleMessage(messages)
        }
    }
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

    let utcCompletionDateTime = undefined;
    let lclCompletionTime = '';
    let lclCompletionDateTime = '';
    if (params.completiontime !== undefined) {
        utcCompletionDateTime = fixDateTimeToJSDate(params.completiontime);
        //console.log(`UTC: ${getUTCDateTimeStr(utcCompletionDateTime)}`);
        lclCompletionDateTime = getLclDateTimeStr(utcCompletionDateTime);
        //console.log(`LCL: ${lclCompletionDateTime}`);
        if (params.resend !== undefined && params.resend === 'yes' && new Date(utcCompletionDateTime) < getLclToday()) {
            historic = true;
            console.log(`HISTORY TIME ${lclCompletionDateTime}`);
        }
        lclCompletionTime = removeMilliseconds(historic ? getLclDateTimeStr(new Date(utcCompletionDateTime)) : getLclTimeStr(new Date(utcCompletionDateTime)));
    }

    switch (params.domain) {
        case Domain.SYSTEM:
            systemDomain(params, lclCompletionDateTime, lclCompletionTime);
            break;
        case Domain.COMPANY:
            companyDomain(params, lclCompletionDateTime, lclCompletionTime);
            break;
        case Domain.ORDER:
            orderDomain(params, lclCompletionDateTime, lclCompletionTime);
            break;
        case Domain.RISK:
            riskDomain(params, lclCompletionDateTime, lclCompletionTime);
            break;
        default:
            console.error(`Domain not handled:` + params.domain);
            break;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// Domain processing
function systemDomain(params, lclCompletionDateTime, lclCompletionTime) {
    console.log(`System response`);
    if (params.domainRef === DomainRef.VERSION) {
        document.title = `Risk v${params.version} Usr:${params.name}`
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
}

function companyDomain(params, lclCompletionDateTime, lclCompletionTime) {
    console.log(`Company response`);
    switch (params.domainRef) {
        case DomainRef.SUBSCRIPTION:
            let rowId = 'row-' + params.messageid;
            let rowElement = tableCpy.row('#' + rowId);
            if (rowElement.length) {
                //let rowIdx = rowElement.rowIndex;
                console.log(`Company Update ${rowId}`);
                //let cell = tableCpy.cell(rowIdx,tableCpyCols.CONNECTIONSTATUS);
                //cell.data(params.connectionstatus);
                //tableCpy.draw();
                let rowData = rowElement.data();
                rowData[tableCpyCols.COMPANYALIAS] = params.companyalias;
                rowData[tableCpyCols.CONNECTIONSTATUS] = params.connectionstatus;
                rowData[tableCpyCols.COMPLETIONTIME] = lclCompletionDateTime;
                rowElement.invalidate();
                rowElement.data(rowData).draw();
            } else {
                console.log(`Company Add`);
                tableCpy.row.add([
                    params.messageid,
                    params.company,
                    params.companyalias,
                    params.connectionstatus,
                    lclCompletionDateTime
                ]).node().id = rowId;
                tableCpy.draw();
            }
            break;
        default:
            console.error(`DomainRef not handled:` + params.domainRef);
            break;
    }
}

function orderDomain(params, lclCompletionDateTime, lclCompletionTime) {
    console.log(`Order response`);
    switch (params.domainRef) {
        case DomainRef.SUBSCRIPTION:
            let rowId = 'row-' + params.messageid;
            let rowElement = tableOrd.row('#' + rowId);
            if (rowElement.length) {
                console.log(`Order Update`);
                let rowData = rowElement.data();
                rowData[tableOrdCols.ORDERQTY] = params.orderqty;
                rowData[tableOrdCols.ORDSTATUS] = params.ordstatus;
                rowData[tableOrdCols.COMPLETIONTIME] = lclCompletionDateTime;
                rowElement.data(rowData).draw(false);
            } else {
                console.log(`Order Add`);
                tableOrd.row.add([
                    params.messageid,
                    params.ordstatus,
                    params.symbol,
                    params.side,
                    params.orderqty,
                    lclCompletionDateTime
                ]).node().id = rowId;
                tableOrd.draw();
            }
            break;
        default:
            console.error(`DomainRef not handled:` + params.domainRef);
            break;
    }
}

function riskDomain(params, lclCompletionDateTime, lclCompletionTime) {
    console.log(`Risk response`);
    switch (params.domainRef) {
        case DomainRef.SUBSCRIPTION:
            let rowId = 'row-' + params.messageid;
            let rowElement = tableRsk.row('#' + rowId);
            if (rowElement.length) {
                console.log(`Risk Update`);
                let rowData = rowElement.data();
                rowData[tableRskCols.COMPLETIONTIME] = lclCompletionDateTime;
                rowElement.data(rowData).draw(false);
            } else {
                console.log(`Risk Add`);
                tableRsk.row.add([
                    params.messageid,
                    params.companyalias,
                    params.rmpositionvalue,
                    params.rmpendingvalue,
                    params.pendinglongs,
                    params.pendingsells,
                    params.pendingshorts,
                    params.rmnettotalvalue,
                    lclCompletionDateTime
                ]).node().id = rowId;
                tableRsk.draw();
            }
            break;
        case DomainRef.QUERY:
            tableRskSettings.row.add([
                params.messageid,
                params.companyalias,
                params.rmattrib,
                params.creditlimitmaxlongorderqty3,
                params.rmsanityroutingtype,
                lclCompletionDateTime
            ]);
            tableRskSettings.draw();
            break;
        default:
            console.error(`DomainRef not handled:` + params.domainRef);
            break;
    }
}
