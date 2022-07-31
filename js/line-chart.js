class LineChart {
  constructor(wrapper, data, color, selectedRegions) {
    this.wrapper = wrapper;
    this.data = data;
    this.color = color;
    this.selectedRegions = selectedRegions;
    this.init();
  }

  init() {
    // Chart dimension
    this.margin = {
      top: 40,
      right: 200,
      bottom: 40,
      left: 40,
    };
    this.width = this.wrapper.node().clientWidth;
    this.height = this.wrapper.node().clientHeight;

    // Scales
    this.x = d3
      .scaleLinear()
      .domain(d3.extent(this.data.years))
      .range([this.margin.left, this.width - this.margin.right]);

    const allValues = d3.merge(
      [...this.data.series.values()].map((d) => d.values)
    );
    this.y = d3
      .scaleLinear()
      .domain(d3.extent(allValues))
      .range([this.height - this.margin.bottom, this.margin.top])
      .nice();

    // Line generator
    this.line = d3
      .line()
      .x((d, i) => this.x(this.data.years[i]))
      .y((d) => this.y(d))
      .curve(d3.curveMonotoneX)
      .defined((d) => d !== null);

    // containers
    this.svg = this.wrapper
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .on("mouseenter", () => {
        this.mouseentered();
      })
      .on("mousemove", (event) => {
        this.mousemoved(event);
      })
      .on("mouseleave", () => {
        this.mouseleft();
      });

    this.gXAxis = this.svg.append("g").attr("class", "x axis");

    this.gYAxis = this.svg.append("g").attr("class", "y axis");

    this.yTitle = this.svg.append("text").attr("class", "axis-title");

    this.gLines = this.svg.append("g").attr("class", "lines");

    this.gAnnotations = this.svg.append("g").attr("class", "annotations");

    this.gHovered = this.svg.append("g").attr("class", "hovered");
  }

  update() {
    // Filter countries to show the ones from the selected regions
    this.visibleSeries = d3
      .merge(
        this.data.regions
          // Only show selected regions
          .filter((region) => this.selectedRegions.includes(region))
          // Put the colored regions at the end so they won't be covered by the non colored regions
          .sort((regionA, regionB) => {
            if (this.coloredRegions.includes(regionA)) return 1;
            if (this.coloredRegions.includes(regionB)) return -1;
            return 0;
          })
          // Get country codes of selected regions
          .map((region) => this.data.countryCodeByRegion.get(region))
          // Get each country's data
          .map((countryCodes) =>
            countryCodes.map((countryCode) => this.data.series.get(countryCode))
          )
      )
      .filter((d) => d !== undefined);

    // Hover interaction only applies to colored regions
    const coloredSeries = this.visibleSeries.filter((d) =>
      this.coloredRegions.includes(d.region)
    );
    console.log(coloredSeries);
    // Convert colored series to individual points so we can use Delaunay to find the hovered point
    this.points = d3
      .merge(
        coloredSeries.map((d) =>
          d.values.map((value, i) => {
            const year = this.data.years[i];
            const point = [this.x(this.data.years[i]), this.y(value)];
            point.name = d.name;
            point.region = d.region;
            point.year = year;
            point.value = value;
            point.d = d; // Save the original series data for easy access
            return point;
          })
        )
      )
      .filter((d) => d.value !== null);
    this.delaunay = d3.Delaunay.from(this.points);

    this.render();
  }

  render() {
    // X axis
    this.gXAxis
      .attr("transform", `translate(0,${this.height - this.margin.bottom})`)
      .call(
        d3
          .axisBottom(this.x)
          .tickValues(this.data.years)
          .tickFormat(d3.format("d"))
      )
      .call((g) => g.select(".domain").remove());

    // Y axis
    this.gYAxis
      .attr("transform", `translate(${this.margin.left},0)`)
      .call(d3.axisLeft(this.y).ticks(5))
      .call((g) => g.select(".domain").remove());

    // Y title
    this.yTitle
      .attr("x", 16)
      .attr("y", this.margin.top - 8)
      .text(
        "Total liters of pure alcohol consumption per capita, 15+ years of age"
      );

    // Lines
    this.linePath = this.gLines
      .selectAll(".line")
      .data(this.visibleSeries, (d) => d.name)
      .join((enter) =>
        enter.append("path").attr("class", "line").attr("fill", "none")
      )
      .attr("stroke", (d) =>
        this.coloredRegions.includes(d.region)
          ? this.color(d.region)
          : "currentColor"
      )
      .attr("d", (d) => this.line(d.values));

    // Annotations
    this.gAnnotations.selectAll("*").remove();
    this.annotation = this.gAnnotations
      .selectAll(".annotation")
      .data(this.annotations)
      .join("g")
      .attr("class", "annotation");
    this.annotation
      .append("path")
      .attr("class", "annotation-line")
      .attr("fill", "none")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", 6)
      .attr("stroke", (d) => d.color)
      .attr("d", (d) => this.line(this.data.series.get(d.code).values));
    this.annotation
      .append("text")
      .attr("class", "annotation-text")
      .attr("fill", (d) => d.color)
      .attr("x", this.width - this.margin.right + 8)
      .attr("y", (d) => {
        const values = this.data.series.get(d.code).values;
        const latestValue = values[values.length - 1];
        return this.y(latestValue);
      })
      .attr("dy", "0.35em")
      .text((d) => d.text)
      .call(wrap, this.margin.right - 16);
  }

  mouseentered() {
    this.iHovered = null;
  }

  mousemoved(event) {
    const i = this.delaunay.find(...d3.pointer(event));
    if (isNaN(i)) return;
    if (this.iHovered === i) return;
    this.iHovered = i;
    const p = this.points[this.iHovered];

    // Hovered
    this.linePath.classed("mute", (d) => d.name !== p.name);

    this.gHovered.selectAll("*").remove();
    // Dots and values
    const s = p.d;
    const gPoint = this.gHovered
      .attr("fill", this.color(s.region))
      .selectAll(".point")
      .data(
        s.values
          .map((d, i) => ({
            year: this.data.years[i],
            value: d,
          }))
          .filter((d) => d.value !== null)
      )
      .join("g")
      .attr("class", "point")
      .attr(
        "transform",
        (d) => `translate(${this.x(d.year)},${this.y(d.value)})`
      );
    gPoint.append("circle").attr("class", "point-dot").attr("r", 2);
    gPoint
      .append("text")
      .attr("class", "point-value")
      .attr("text-anchor", "middle")
      .attr("y", -6)
      .text((d) => d.value.toFixed(2));
    this.gHovered
      .append("text")
      .attr("class", "hovered-name")
      .attr("x", this.width - this.margin.right + 8)
      .attr("y", this.y(s.values[s.values.length - 1]))
      .attr("dy", "0.35em")
      .text(s.name)
      .call(wrap, this.margin.right - 16);
  }

  mouseleft() {
    this.iHovered = null;
    this.gHovered.selectAll("*").remove();
    this.linePath.classed("mute", false);
  }
}

// https://bl.ocks.org/mbostock/7555321
// Wrapping Long Labels
function wrap(text, width) {
  text.each(function () {
    var text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 1.1, // ems
      x = text.attr("x"),
      y = text.attr("y"),
      dy = parseFloat(text.attr("dy")),
      tspan = text
        .text(null)
        .append("tspan")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", dy + "em");
    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text
          .append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    }
  });
}
