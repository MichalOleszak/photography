/*
 * Leaflet.js interactive world map for Photography by Michał Oleszak
 * Replaces the old FlaMap/Raphael.js SVG map with a modern, dark-themed map.
 * Uses CartoDB DarkMatter tiles + world-atlas TopoJSON for country boundaries.
 */

(function () {

    // ───────────────────────────────────────────────
    // Visited countries: ISO 3166-1 numeric code → { slug, name }
    // slug is null for countries visited but without a dedicated photo page
    // ───────────────────────────────────────────────
    var visitedCountries = {
        '040': { slug: 'austria', name: 'Austria' },
        '442': { slug: null, name: 'Luxembourg' },
        '438': { slug: null, name: 'Liechtenstein' },
        '056': { slug: 'belgium', name: 'Belgium' },
        '070': { slug: null, name: 'Bosnia and Herzegovina' },
        '100': { slug: 'bulgaria', name: 'Bulgaria' },
        '156': { slug: 'china', name: 'China' },
        '188': { slug: 'costarica', name: 'Costa Rica' },
        '191': { slug: null, name: 'Croatia' },
        '196': { slug: 'cyprus', name: 'Cyprus' },
        '203': { slug: null, name: 'Czechia' },
        '208': { slug: 'denmark', name: 'Denmark' },
        '250': { slug: 'france', name: 'France' },
        '268': { slug: 'georgia', name: 'Georgia' },
        '276': { slug: 'germany', name: 'Germany' },
        '300': { slug: null, name: 'Greece' },
        '348': { slug: null, name: 'Hungary' },
        '352': { slug: 'iceland', name: 'Iceland' },
        '360': { slug: 'indonesia', name: 'Indonesia' },
        '372': { slug: 'ireland', name: 'Ireland' },
        '380': { slug: 'italy', name: 'Italy' },
        '392': { slug: 'japan', name: 'Japan' },
        '417': { slug: 'kyrgyzstan', name: 'Kyrgyzstan' },
        '428': { slug: 'latvia', name: 'Latvia' },
        '440': { slug: null, name: 'Lithuania' },
        '470': { slug: 'malta', name: 'Malta' },
        '499': { slug: 'montenegro', name: 'Montenegro' },
        '504': { slug: 'morocco', name: 'Morocco' },
        '524': { slug: 'nepal', name: 'Nepal' },
        '528': { slug: 'netherlands', name: 'Netherlands' },
        '554': { slug: 'new-zealand', name: 'New Zealand' },
        '578': { slug: 'norway', name: 'Norway' },
        '616': { slug: 'poland', name: 'Poland' },
        '620': { slug: 'portugal', name: 'Portugal' },
        '634': { slug: 'qatar', name: 'Qatar' },
        '642': { slug: 'romania', name: 'Romania' },
        '703': { slug: null, name: 'Slovakia' },
        '705': { slug: null, name: 'Slovenia' },
        '724': { slug: 'spain', name: 'Spain' },
        '752': { slug: 'sweden', name: 'Sweden' },
        '756': { slug: 'switzerland', name: 'Switzerland' },
        '764': { slug: 'thailand', name: 'Thailand' },
        '792': { slug: 'turkey', name: 'Turkey' },
        '784': { slug: 'uae', name: 'United Arab Emirates' },
        '826': { slug: 'uk', name: 'United Kingdom' },
        '840': { slug: 'us', name: 'United States' },
        '704': { slug: 'vietnam', name: 'Vietnam' }
    };

    // Small territories that may not appear in the 50m TopoJSON
    var smallTerritories = [
        { name: 'Faroe Islands', slug: 'faroeislands', lat: 62.0, lng: -6.9 },
        { name: 'Gibraltar', slug: null, lat: 36.14, lng: -5.35 },
        { name: 'Monaco', slug: null, lat: 43.73, lng: 7.42 },
        { name: 'San Marino', slug: null, lat: 43.94, lng: 12.46 },
        { name: 'Singapore', slug: 'singapore', lat: 1.35, lng: 103.82 },
        { name: 'Vatican City', slug: null, lat: 41.90, lng: 12.45 }
    ];

    // Total count for the badge
    var totalVisited = Object.keys(visitedCountries).length + smallTerritories.length;

    // ───────────────────────────────────────────────
    // Initialize Leaflet map
    // ───────────────────────────────────────────────
    var map = L.map('map-container', {
        center: [25, 20],
        zoom: 2.2,
        minZoom: 2,
        maxZoom: 7,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true
    });

    // CartoDB DarkMatter (no labels) — retina tiles rendered at native 512px
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        tileSize: 512,
        zoomOffset: -1
    }).addTo(map);

    // Subtle attribution — bottom-right
    L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a> &copy; <a href="https://carto.com/" target="_blank">CARTO</a>')
        .addTo(map);

    // ───────────────────────────────────────────────
    // Country count badge
    // ───────────────────────────────────────────────

    // Back badge (left of country count badge)
    var BackBadge = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            // Create a container div to hold both badges side by side
            var container = L.DomUtil.create('div', 'badge-container');
            // Back badge styled like the country count badge
            var backDiv = L.DomUtil.create('a', 'country-count-badge back-tile', container);
            backDiv.href = 'https://michaloleszak.com';
            backDiv.title = 'Back to michaloleszak.com';
            backDiv.setAttribute('aria-label', 'Back to michaloleszak.com');
            backDiv.setAttribute('rel', 'noopener');
            backDiv.style.display = 'inline-flex';
            backDiv.style.alignItems = 'center';
            backDiv.style.justifyContent = 'center';
            backDiv.style.width = '120px';
            backDiv.style.height = '120px';
            backDiv.style.marginRight = '0.5rem';
            backDiv.innerHTML = '<span class="icon fa-arrow-left" style="font-size:2.5em; color:#7798BA;"></span>';
            L.DomEvent.disableClickPropagation(backDiv);
            // The actual country count badge will be added by CountBadge
            return container;
        }
    });
    var CountBadge = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            var div = L.DomUtil.create('div', 'country-count-badge');
            div.innerHTML = '<span class="count">' + totalVisited + '</span>' +
                '<span class="label">countries<br>visited</span>';
            L.DomEvent.disableClickPropagation(div);
            return div;
        }
    });
    var badgeContainer = new BackBadge();
    badgeContainer.addTo(map);
    // Add the country count badge into the same container
    setTimeout(function() {
        var container = document.querySelector('.badge-container');
        if (container) {
            var countBadge = L.DomUtil.create('div', 'country-count-badge', container);
            countBadge.innerHTML = '<span class="count">' + totalVisited + '</span>' +
                '<span class="label">countries<br>visited</span>';
            countBadge.style.display = 'inline-flex';
            countBadge.style.alignItems = 'center';
            countBadge.style.justifyContent = 'center';
            countBadge.style.width = '120px';
            countBadge.style.height = '120px';
            countBadge.style.verticalAlign = 'top';
        }
    }, 0);

    // ───────────────────────────────────────────────
    // Helper: navigate with page transition
    // ───────────────────────────────────────────────
    function navigateTo(slug) {
        document.body.classList.add('page-leaving');
        setTimeout(function () {
            window.location.href = slug;
        }, 300);
    }

    // ───────────────────────────────────────────────
    // Load world boundaries from TopoJSON (50m resolution)
    // ───────────────────────────────────────────────
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
        .then(function (res) { return res.json(); })
        .then(function (world) {
            var allCountries = topojson.feature(world, world.objects.countries);

            // Only render visited countries.  Unvisited-country polygons
            // extend to the Mercator clipping latitude (~±85°) and their
            // borders create visible horizontal lines across the map.
            // The CartoDB DarkMatter tiles already show the landmass shapes,
            // so nothing visual is lost by omitting the unvisited GeoJSON.
            var visitedFeatures = {
                type: 'FeatureCollection',
                features: allCountries.features.filter(function (f) {
                    return visitedCountries.hasOwnProperty(f.id);
                })
            };

            L.geoJSON(visitedFeatures, {
                style: function () {
                    return {
                        fillColor: '#7798BA',
                        fillOpacity: 0.65,
                        color: '#a0b8cf',
                        weight: 1.2,
                        opacity: 0.9
                    };
                },
                onEachFeature: function (feature, layer) {
                    var id = feature.id;
                    var data = visitedCountries[id];

                    // Tooltip
                    var label = data.name;
                    if (!data.slug) label += '  <span class="no-photos">(no photos yet)</span>';
                    layer.bindTooltip(label, {
                        className: 'country-tooltip',
                        sticky: true,
                        direction: 'top',
                        offset: [0, -10]
                    });

                    // Hover
                    layer.on('mouseover', function () {
                        layer.setStyle({ fillColor: '#366CA3', fillOpacity: 0.85 });
                        if (data.slug) layer.getElement().style.cursor = 'pointer';
                    });
                    layer.on('mouseout', function () {
                        layer.setStyle({ fillColor: '#7798BA', fillOpacity: 0.65 });
                    });

                    // Click → navigate to country page
                    if (data.slug) {
                        layer.on('click', function () {
                            navigateTo(data.slug);
                        });
                    }
                }
            }).addTo(map);

            // ───────────────────────────────────────
            // Small territory markers
            // ───────────────────────────────────────
            smallTerritories.forEach(function (t) {
                var marker = L.circleMarker([t.lat, t.lng], {
                    radius: 5,
                    fillColor: '#7798BA',
                    fillOpacity: 0.7,
                    color: '#424242',
                    weight: 1
                });

                var label = t.name;
                if (!t.slug) label += '  <span class="no-photos">(no photos yet)</span>';
                marker.bindTooltip(label, {
                    className: 'country-tooltip',
                    direction: 'top',
                    offset: [0, -8]
                });

                marker.on('mouseover', function () {
                    marker.setStyle({ fillColor: '#366CA3', fillOpacity: 0.85, radius: 7 });
                });
                marker.on('mouseout', function () {
                    marker.setStyle({ fillColor: '#7798BA', fillOpacity: 0.7, radius: 5 });
                });

                if (t.slug) {
                    marker.on('click', function () {
                        navigateTo(t.slug);
                    });
                }

                marker.addTo(map);
            });

            // Remove loading state once the map is ready
            document.body.classList.remove('loading');
        })
        .catch(function (err) {
            console.error('Failed to load world map data:', err);
            document.body.classList.remove('loading');
        });

    // ───────────────────────────────────────────────
    // Responsive: adjust view on small screens
    // ───────────────────────────────────────────────
    var defaultCenter = [25, 20];
    var defaultZoom = 3;

    function adjustMapView() {
        if (window.innerWidth <= 480) {
            defaultCenter = [20, 20];
            defaultZoom = 1;
        } else if (window.innerWidth <= 980) {
            defaultCenter = [20, 20];
            defaultZoom = 2;
        }
        map.setView(defaultCenter, defaultZoom);
    }
    adjustMapView();

    // Reset to default view when navigating back (bfcache)
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            map.setView(defaultCenter, defaultZoom);
            map.invalidateSize();
        }
    });

})();
