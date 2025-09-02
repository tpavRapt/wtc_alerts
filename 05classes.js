class PostMessage {
    constructor(compositeKey = null, type = null, side = null, Symbol = null, holdingsID = null) {
        this.compositeKey = compositeKey;
        this.type = type;
        this.side = side;
        this.symbol = Symbol;
        this.holdingsID = holdingsID;
    }

    openFilteredDashboard() {
        const message = {
            action: 'INSERT',
            context: 'routes',
            statement: `./SalesDash/index.html?getClient=${this.type}&getSymbol=${this.symbol}`
       };
        console.log(`DEBUG: Open Filtered Dashboard request message: ${JSON.stringify(message)}`);
        return JSON.stringify(message);
    }

    loadFilteredNews() {
        const message = {
            action: 'INSERT',
            context: 'routes',
            statement: `./RSS-Reader/index.html?getSymbol=${this.symbol}`
       };
        console.log(`DEBUG: Open Filtered Dashboard request message: ${JSON.stringify(message)}`);
        return JSON.stringify(message);
    }


    retrieveIoiById() {
        const message = {
            action: 'SELECT',
            context: 'query',
            database: 'MESSAGE',
            filter: 'IOI',
            rowId: this.compositeKey,
            limit: '1',
            statement: `MessageId in (${this.compositeKey.split('_')[0]})`
        };
        console.log(`DEBUG: Retrieve IOI By ID request message: ${JSON.stringify(message)}`);
        return JSON.stringify(message);
    }

    // Used exclusively to retrieve the IOI that generated the Alert
    retrieveMatchIoiById() {
        const message = {
            action: 'SELECT',
            context: 'query',
            database: 'MESSAGE',
            filter: 'IOI',
            rowId: `${this.compositeKey}_ALERTIOI`,
            limit: '1',
            statement: `MessageId in (${this.compositeKey.split('_')[0]})`
        };
        console.log(`DEBUG: Retrieve Match IOI By ID request Messsage: ${JSON.stringify(message)}`);
        return JSON.stringify(message);
    }

    retrieveOrderBySymbol() {
        const message = {
            action: 'SELECT',
            context: 'query',
            database: 'MESSAGE',
            filter: 'INBOUND_ORDER',
            statement: `Symbol=${this.symbol}`,
            limit: '1',
            rowId: this.compositeKey
        };
        console.log(`DEBUG: Retrieve Order By Symbol request message: ${JSON.stringify(message)}`);
        return JSON.stringify(message);
    }

    retrieveHoldingsDetail() {
        const message = {
            action: 'SELECT',
            context: 'query',
            database: 'HOLDINGS_DB',
            filter: 'HOLDINGS',
            rowId: this.compositeKey,
            limit: '1',
            statement: `Symbol=${this.symbol} AND HoldingsAccountID=${this.holdingsID}`                
        };
        console.log(`DEBUG: Retrieve Holdings Detail request message: ${JSON.stringify(message)}`);
        return JSON.stringify(message);
    }

    salesDashboard() {
        const message = {
            action: 'INSERT',
            context: 'routes',
            statement: '/WTCDashboard-PartiallyWorking/index.html',
            width: '2400',
            height: '1600'
       };
       console.log(`DEBUG: SALES Dashboard request message: ${JSON.stringify(message)}`);
       return JSON.stringify(message);
    }
    
    retrieveOrderDetail() { 
        const message = {
            action: 'SELECT',
            context: 'query',
            database: 'MESSAGE',
            filter: 'INBOUND_ORDER',
            statement: `Symbol=${this.symbol} and Side=${this.side}`,
            rowId: this.compositeKey,
            limit: '1'
        };
        console.log(`DEBUG: Retrieve Order Detail request message: ${JSON.stringify(message)}`);
        return JSON.stringify(message);
    }

    retrieveIOIDetail() { 
        const message = {
            action: 'SELECT',
            context: 'query',
            database: 'MESSAGE',
            filter: 'IOI',
            statement: `Symbol=${this.symbol} and Side=${this.side}`,
            rowId: this.compositeKey,
            limit: '1'
        };
        console.log(`DEBUG: Retrieve IOI Detail request message: ${JSON.stringify(message)}`);
        return JSON.stringify(message);
    }

    retrieveIntradayIOIDetail() {
        const message = {
            action: 'SELECT',
            context: 'query',
            database: 'MESSAGE',
            filter: 'ALL_IOI_TODAY',
            statement: `Symbol=${this.symbol} and Side=${this.side}`,
            rowId: this.compositeKey,
            limit: '1'
        };
        console.log(`DEBUG: Retrieve - INTRADAY IOI - Detail with message: ${JSON.stringify(message)}`);
        return JSON.stringify(message);
    }
    
    retrieveHistoryORderDetail() {        
        const message = {
                action: 'SELECT',
                context: 'query',
                database: 'HISTORY_DB',
                filter: 'ALL',
                statement: `Symbol=${this.symbol} AND Side=${this.side} AND OrderQty >= 10000 AND MsgType = FSMDCOrder`,
                rowId: this.compositeKey,
                limit: '1'
            };
        console.log(`DEBUG: Retrieve History Order Detail request message: ${JSON.stringify(message)}`);
        return JSON.stringify(message); 
    }

    retrieveHistoryIOIDetail() {        
        // const Side = (this.side === 'S') ? 'B' : 'S'; 
         const message = {
                 action: 'SELECT',
                 context: 'query',
                 database: 'HISTORY_DB',
                 filter: 'ALL',
                 statement: `Symbol=${this.symbol} AND Side=${this.side} AND MsgType = IOI`,
                 rowId: this.compositeKey,
                 limit: '1'
             };
         console.log(`DEBUG: Retrieve History Order Detail request message: ${JSON.stringify(message)}`);
         return JSON.stringify(message); 
    }

    retrieveMyClients() {        
         const message = {
                 action: 'SELECT',
                 context: 'query',
                 database: 'MY_COMPANIES',
                 filter: 'ALL',
                 rowId: this.requestId
             };
         console.debug(`[DEBUG] My Clients request: ${JSON.stringify(message)}`);
         return JSON.stringify(message); 
    }
}
