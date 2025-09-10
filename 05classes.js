

class PostMessage {
    constructor(compositeKey = null, type = null, side = null, Symbol = null, holdingsID = null) {
        this.compositeKey = compositeKey;
        this.type = type;
        this.side = side;
        this.symbol = Symbol;
        this.holdingsID = holdingsID;
    }

    initRequest(){
        const params = {
            domain: 'system',
            domainRef: 'version',
        };
        const message = AddRequiredRequestKeys(undefined, 'GET', params);
        return message;
    }

    listAlerts(){
        const params = {
            domain: 'alert',
            domainRef: 'all',
        };
        const message = AddRequiredRequestKeys(undefined, 'GET', params);
        return message;
    }

    initAlerts(){
        const params = {
            domain: 'alert',
            domainRef: 'ioi',
            id:'HotIOIs',
            alertbehavior:`RaptorDesktop`,
            storedproctype:`IOI`,
            query:`Status & Normal <> 0`
        };
        const message = AddRequiredRequestKeys(undefined, 'POST', params);
        return message;
    }
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    openFilteredDashboard() {
        const _params = {
            domain: 'gui',
            domainRef: 'window',
            page: `./SalesDash/index.html?getClient=${this.type}&getSymbol=${this.symbol}`
        };
        const message = AddRequiredRequestKeys(undefined, 'POST', _params);
//        const message = {
//            action: 'INSERT',
//            context: 'routes',
//            statement: `./SalesDash/index.html?getClient=${this.type}&getSymbol=${this.symbol}`
//       };
        console.log(`WINDOW: SalesDash for ${this.compositeKey}`);
        return message;
    }

    loadFilteredNews() {
        const _params = {
            domain: 'gui',
            domainRef: 'window',
            page: `./RSS-Reader/index.html?getSymbol=${this.symbol}`
        };
        const message = AddRequiredRequestKeys(undefined, 'POST', _params);
//        const message = {
//            action: 'INSERT',
//            context: 'routes',
//            statement: `./RSS-Reader/index.html?getSymbol=${this.symbol}`
//       };
        console.log(`WINDOW: RSS-Reader for: ${this.compositeKey}`);
        return message;
    }

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Used exclusively to retrieve the IOI that generated the Alert
    retrieveMatchIoiById() {
        const id = this.compositeKey;//.split('_')[0] + '_ALERTED';
        const _params = {
            domain: 'ioi',
            domainRef: 'query',
            limit: '1',
            query: `RefFSMID=${this.compositeKey} OR RefMessageID=${this.compositeKey} OR MessageID=${this.compositeKey}`
        };
        const message = AddRequiredRequestKeys(id, 'GET', _params);
        //const message = {
        //    action: 'SELECT',
        //    context: 'query',
        //    database: 'MESSAGE',
        //    filter: 'IOI',
        //    rowId: `${this.compositeKey}_ALERTIOI`,
        //    limit: '1',
        //    statement: `MessageId in (${this.compositeKey.split('_')[0]})`
        //};
        console.log(`REQUEST: Alerted IOIs for ${id}`);
        return message;
    }
    
    retrieveOrderDetail() { 
        const _params = {
            domain: 'order',
            domainRef: 'query',
            //rowId: this.compositeKey,
            limit: '1',
            query: `Symbol=${this.symbol} and Side=${this.side}`
        };
        const message = AddRequiredRequestKeys(this.compositeKey, 'GET', _params);
//        const message = {
//            action: 'SELECT',
//            context: 'query',
//            database: 'MESSAGE',
//            filter: 'INBOUND_ORDER',
//            statement: `Symbol=${this.symbol} and Side=${this.side}`,
//            rowId: this.compositeKey,
//            limit: '1'
//        };
        console.log(`REQUEST O-CROSS for ${this.compositeKey}`);
        return message;
    }

    retrieveIntradayIOIDetail() {
        const _params = {
            domain: 'ioi',
            domainRef: 'query',
            //rowId: this.compositeKey,
            limit: '1',
            query: `Symbol=${this.symbol} and Side=${this.side}`
        };
        const message = AddRequiredRequestKeys(this.compositeKey, 'GET', _params);
//        const message = {
//            action: 'SELECT',
//            context: 'query',
//            database: 'MESSAGE',
//            filter: 'ALL_IOI_TODAY',
//            statement: `Symbol=${this.symbol} and Side=${this.side}`,
//            rowId: this.compositeKey,
//            limit: '1'
//        };
        console.log(`REQUEST I-CROSS for ${this.compositeKey}`);
        return message;
    }
    
    retrieveHoldingsDetail() {
        const _params = {
            domain: 'history',
            domainRef: 'holdings',
            //rowId: this.compositeKey,
            limit: '1',
            query: `Symbol=${this.symbol} AND HoldingsAccountID=${this.holdingsID}`
        };
        const message = AddRequiredRequestKeys(this.compositeKey, 'GET', _params);
//        const message = {
//            action: 'SELECT',
//            context: 'query',
//            database: 'HOLDINGS_DB',
//            filter: 'HOLDINGS',
//            rowId: this.compositeKey,
//            limit: '1',
//            statement: `Symbol=${this.symbol} AND HoldingsAccountID=${this.holdingsID}`                
//        };
        console.log(`REQUEST 13F HOLDINGS for ${this.compositeKey}, Holdings:${this.holdingsID}`);
        return message;
    }

    retrieveHistoryORderDetail() {        
        const _params = {
            domain: 'history',
            domainRef: 'dropcopy',
            //rowId: this.compositeKey,
            limit: '1',
            query: `Symbol=${this.symbol} AND Side=${this.side} AND OrderQty >= 10000 AND MsgType = FSMDCOrder`
        };
        const message = AddRequiredRequestKeys(this.compositeKey, 'GET', _params);
//        const message = {
//                action: 'SELECT',
//                context: 'query',
//                database: 'HISTORY_DB',
//                filter: 'ALL',
//                statement: `Symbol=${this.symbol} AND Side=${this.side} AND OrderQty >= 10000 AND MsgType = FSMDCOrder`,
//                rowId: this.compositeKey,
//                limit: '1'
//            };
        console.log(`REQUEST O-HIST for ${this.compositeKey}`);
        return message; 
    }

    retrieveHistoryIOIDetail() {        
        // const Side = (this.side === 'S') ? 'B' : 'S'; 
        const _params = {
            domain: 'history',
            domainRef: 'ioi',
            //rowId: this.compositeKey,
            limit: '1',
            query: `Symbol=${this.symbol} AND Side=${this.side} AND MsgType = IOI`
        };
        const message = AddRequiredRequestKeys(this.compositeKey, 'GET', _params);
//        const message = {
//                 action: 'SELECT',
//                 context: 'query',
//                 database: 'HISTORY_DB',
//                 filter: 'ALL',
//                 statement: `Symbol=${this.symbol} AND Side=${this.side} AND MsgType = IOI`,
//                 rowId: this.compositeKey,
//                 limit: '1'
//             };
         console.log(`REQUEST I-HIST for ${this.compositeKey}`);
         return message; 
    }


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//    // NOT USED
//    retrieveMyClients() {        
//         const message = {
//                 action: 'SELECT',
//                 context: 'query',
//                 database: 'MY_COMPANIES',
//                 filter: 'ALL',
//                 rowId: this.requestId
//             };
//         console.debug(`[DEBUG] My Clients request: ${JSON.stringify(message)}`);
//         return message; 
//    }
//
//    // NOT USED
//    retrieveOrderBySymbol() {
//        const message = {
//            action: 'SELECT',
//            context: 'query',
//            database: 'MESSAGE',
//            filter: 'INBOUND_ORDER',
//            statement: `Symbol=${this.symbol}`,
//            limit: '1',
//            rowId: this.compositeKey
//        };
//        console.log(`DEBUG: Retrieve Order By Symbol request message: ${JSON.stringify(message)}`);
//        return message;
//    }
//    
//    // NOT USED
//    retrieveIOIDetail() { 
//        const message = {
//            action: 'SELECT',
//            context: 'query',
//            database: 'MESSAGE',
//            filter: 'IOI',
//            statement: `Symbol=${this.symbol} and Side=${this.side}`,
//            rowId: this.compositeKey,
//            limit: '1'
//        };
//        console.log(`DEBUG: Retrieve IOI Detail request message: ${JSON.stringify(message)}`);
//        return message;
//    }
//
//    // NOT USED
//    retrieveIoiById() {
//        const message = {
//            action: 'SELECT',
//            context: 'query',
//            database: 'MESSAGE',
//            filter: 'IOI',
//            rowId: this.compositeKey,
//            limit: '1',
//            statement: `MessageId in (${this.compositeKey.split('_')[0]})`
//        };
//        console.log(`DEBUG: Retrieve IOI By ID request message: ${JSON.stringify(message)}`);
//        return message;
//    }
//
//    // NOT USED
//    salesDashboard() {
//        const _params = {
//            domain: 'gui',
//            domainRef: 'window',
//            page: `/WTCDashboard-PartiallyWorking/index.html`,
//            width: '2400',
//            height: '1600'
//        };
//        const message = AddRequiredRequestKeys(undefined, 'POST', _params);
////        const message = {
////            action: 'INSERT',
////            context: 'routes',
////            statement: '/WTCDashboard-PartiallyWorking/index.html',
////            width: '2400',
////            height: '1600'
////       };
//       console.log(`WINDOW: PartiallyWorking Dashboard for ${this.compositeKey}`);
//       return message;
//    }
}
