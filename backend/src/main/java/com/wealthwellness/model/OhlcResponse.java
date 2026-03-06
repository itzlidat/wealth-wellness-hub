package com.wealthwellness.model;

import java.util.List;

public class OhlcResponse {
    private String ticker;
    private String currency;
    private List<OhlcBar> bars;

    public OhlcResponse(String ticker, String currency, List<OhlcBar> bars) {
        this.ticker = ticker;
        this.currency = currency;
        this.bars = bars;
    }

    public String getTicker()       { return ticker; }
    public String getCurrency()     { return currency; }
    public List<OhlcBar> getBars()  { return bars; }
}
