const width = 600;
const height = 300;

const comp2 = (a, b) => (x) => a(b(x));

const readX = d => d.x;
const readY = d => d.y;

// var xAxis = d3.axisBottom(x);
// var yAxis = d3.axisLeft(y);

const init = (container, {width, height}) =>
  container
    .append('svg')
      .attr('width', width)
      .attr('height', height)
    .append('g');

// Renders the chart
const chart = (svg, series, config) => {

  const {width, height, readX, readY} = config;

  const calcD = d => {
    const x = d3.scaleTime()
      .range([0, width])
      .domain(d3.extent(d, readX));

    const y = d3.scaleLinear()
      .range([height, 0])
      .domain(d3.extent(d, readY));

    const line = d3.line()
      .x(comp2(x, readX))
      .y(comp2(y, readY));

    return line(d);
  }

  svg.selectAll('.chart-line')
    .data(series)
      .attr('d', calcD)
    .enter()
      .append('path')
      .attr('class', 'chart-line')
      .attr('d', calcD)
    .exit()
      .remove();

  return svg;
}

const svg = init(d3.select('#chart'), {
  width: 800,
  height: 300
});

chart(svg, [data, data2], {
  data,
  width: 800,
  height: 300,
  readX,
  readY
});