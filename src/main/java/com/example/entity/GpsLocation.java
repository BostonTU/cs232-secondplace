package com.example.entity;

import jakarta.persistence.Embeddable;

@Embeddable
public class GpsLocation {

    private Double latitude;
    private Double longitude;

    public GpsLocation() {}

    public GpsLocation(Double latitude, Double longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
}