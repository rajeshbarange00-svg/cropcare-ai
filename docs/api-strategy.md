# CropCare AI — API Strategy

## APIs selected from the public-apis catalog

### 1. Open-Meteo — weather and agrometeorological context
Use for current weather, forecast, precipitation, humidity, temperature, evapotranspiration, soil moisture and related weather variables where available.

Role in CropCare AI:
- Weather-aware advisory context
- Irrigation and spray-timing signals
- Weather history for analytics
- Location-based forecast data

Open-Meteo does not require an API key for its free non-commercial API. Review its current terms before commercial deployment.

### 2. Open-Meteo Geocoding — location normalization
Use farmer-entered village/city names to obtain coordinates and administrative location metadata.

Role in CropCare AI:
- Village/city → latitude/longitude
- State/district/location normalization
- Weather lookup input

### 3. Open Government India / India public APIs
Use as an India-local data discovery and integration layer for public government datasets and APIs.

Role in CropCare AI:
- India crop/agriculture datasets
- State/district reference data
- Government datasets that can support validation

API access, licensing and authentication must be verified for each selected dataset before ingestion.

### 4. GitHub API
Use for engineering/data versioning automation rather than agronomy facts.

Role in CropCare AI:
- Store code
- Version processed datasets
- Run update workflows
- Publish validation reports
- Track source/data changes

## Important separation

The public-apis repository is an API discovery catalog, not the CropCare AI agronomy database itself. The final recommendation database should use validated agricultural sources and retain source metadata for every advisory record.

Recommended data flow:

`External sources/API → raw ingestion → normalization → validation → Supabase → advisory rules → React app`

## APIs not added by default

We will not add unrelated APIs just because they are listed in public-apis. Email, entertainment, social, finance and generic testing APIs are not part of the core agricultural database unless a later feature requires them.
