Promise.all([
  d3.csv("data/alcohol-consumption-data.csv"),
  d3.csv("data/world-regions.csv"),
]).then(([alcoholData, regionsData]) => {
  /**
   * Process data
   */
  // Group countries by region
  const countryCodeByRegion = d3.rollup(
    regionsData,
    (v) => v.map((d) => d.Code),
    (d) => d["World Region according to the World Bank"]
  );

  // All region names
  const regions = Array.from(countryCodeByRegion.keys()).sort(d3.ascending);

  // Region by country code
  const regionByCountryCode = new Map(
    regionsData.map((d) => [
      d.Code,
      d["World Region according to the World Bank"],
    ])
  );

  // Convert alcohol data values from string to numbers and index it by country code
  const years = [2000, 2015, 2018];
  const series = d3.rollup(
    alcoholData,
    (v) => {
      const d = v[0]; // Each country code is unique so there's only one data point for each group
      return {
        name: d["Country Name"],
        region: regionByCountryCode.get(d["Country Code"]),
        code: d["Country Code"],
        values: years.map((year) => (d[year] === ".." ? null : +d[year])),
      };
    },
    (d) => d["Country Code"]
  );

  const data = {
    countryCodeByRegion,
    regions,
    years,
    series,
  };

  // Color scale for the regions
  const color = d3.scaleOrdinal().domain(data.regions).range(d3.schemeDark2);

  /**
   * Scenes
   */
  // Define scene variables
  const scenes = [
    // World Trend Overview
    {
      content: `
        <p>Alcohol is a popular beverage that is enjoyed by many people across the world. However, different regions and countries have different alcohol consumption patterns due to diverse social, cultural, religious factors.</p>
        <p>Here we are looking at the trend of alcohol consumption of countries and regions across the world.</p>
      `,
      annotations: [
        {
          code: "WLD",
          color: "#3c4043",
          text: "World Average",
        },
      ],
      coloredRegions: [],
      showLegend: false,
    },
    // Least Alcohol Consumption Region
    {
      content: `
        <p>At the lower end, we can see countries across <span style="color: ${color(
          "Middle East and North Africa"
        )}">Middle East and North Africa</span> have very low alcohol consumption. Some of the countries even are close to 0.</p>
      `,
      annotations: [
        {
          code: "MEA",
          color: d3.color(color("Middle East and North Africa")).darker(),
          text: "Middle East and North Africa Average",
        },
      ],
      coloredRegions: ["Middle East and North Africa"],
      showLegend: false,
    },
    // Most Alcohol Consumption Region
    {
      content: `
        <p>At the higher end, we can see countries across <span style="color: ${color(
          "Europe and Central Asia"
        )}">Europe and Central Asia</span> have rather high alcohol consumption.</p>
      `,
      annotations: [
        {
          code: "ECS",
          color: d3.color(color("Europe and Central Asia")).darker(),
          text: "Europe and Central Asia Average",
        },
      ],
      coloredRegions: ["Europe and Central Asia"],
      showLegend: false,
    },
    // Explore All Countries
    {
      content: `
        <p>Now it's time to explore each individual country's alcohol intake pattern.</p>
        <p>Mouse over the chart to see each country's values. You can also click the legend item to toggle the visibility of each region's lines.</p>
      `,
      annotations: [],
      coloredRegions: [
        "East Asia and Pacific",
        "Europe and Central Asia",
        "Latin America and Caribbean",
        "Middle East and North Africa",
        "North America",
        "South Asia",
        "Sub-Saharan Africa",
      ],
      showLegend: true,
    },
  ];

  /**
   * Initialization
   */
  const contentWrapper = d3.select("#content");
  let selectedRegions = color.domain();
  const chartWrapper = d3.select("#chart");
  const chart = new LineChart(chartWrapper, data, color, selectedRegions);
  const legendWrapper = d3.select("#legend");
  const legend = new LineLegend(legendWrapper, color, selectedRegions);
  triggerScene(d3.select("input[name='trigger']:checked").node().value);

  d3.selectAll("input[name='trigger']").on("change", (event) => {
    triggerScene(event.target.value);
  });

  function triggerScene(i) {
    const scene = scenes[i];

    // Update content
    contentWrapper.html(scene.content);

    // Update chart
    chart.annotations = scene.annotations;
    chart.coloredRegions = scene.coloredRegions;
    chart.selectedRegions = scene.showLegend ? selectedRegions : color.domain();
    chart.update();

    // Update legend
    legend.show = scene.showLegend;
    legend.update();
  }

  // Legend toggle
  legendWrapper.on("change", (event) => {
    if (event.target.checked) {
      selectedRegions = [event.target.value, ...selectedRegions];
    } else {
      selectedRegions = selectedRegions.filter((d) => d !== event.target.value);
    }
    chart.selectedRegions = selectedRegions;
    chart.update();
  });
});
