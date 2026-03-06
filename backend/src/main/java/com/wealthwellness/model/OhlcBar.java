package com.wealthwellness.model;

public class OhlcBar {
    private String time; // "YYYY-MM-DD"
    private double open;
    private double high;
    private double low;
    private double close;

    public OhlcBar(String time, double open, double high, double low, double close) {
        this.time = time;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
    }

    public String getTime()  { return time; }
    public double getOpen()  { return open; }
    public double getHigh()  { return high; }
    public double getLow()   { return low; }
    public double getClose() { return close; }
}
