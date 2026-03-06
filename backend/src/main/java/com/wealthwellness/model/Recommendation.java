package com.wealthwellness.model;

public class Recommendation {
    private String action;
    private String why;

    public Recommendation(String action, String why) {
        this.action = action;
        this.why = why;
    }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getWhy() { return why; }
    public void setWhy(String why) { this.why = why; }
}
