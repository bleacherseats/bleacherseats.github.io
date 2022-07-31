class LineLegend {
  constructor(wrapper, color, selected) {
    this.wrapper = wrapper;
    this.color = color;
    this.selected = selected;
    this.init();
  }

  init() {
    this.item = this.wrapper
      .selectAll(".item")
      .data(this.color.domain())
      .join("div")
      .attr("class", "item");

    this.input = this.item
      .append("input")
      .attr("class", "item-input")
      .attr("type", "checkbox")
      .attr("checked", (d) => (this.selected.includes(d) ? "checked" : null))
      .attr("value", (d) => d)
      .attr("id", (d, i) => `legend-item-${i}`);

    this.label = this.item
      .append("label")
      .attr("class", "item-label")
      .attr("for", (d, i) => `legend-item-${i}`);

    this.label
      .append("div")
      .attr("class", "item-color")
      .style("color", (d) => this.color(d));

    this.label
      .append("div")
      .attr("class", "item-text")
      .text((d) => d);
  }

  update() {
    this.wrapper.style("display", this.show ? null : "none");
  }
}
