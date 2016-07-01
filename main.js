const width = 600;
const height = 300;

const compose = (a, b) => (x) => a(b(x));

const readX = d => d.x;
const readY = d => d.y;

// var xAxis = d3.axisBottom(x);
// var yAxis = d3.axisLeft(y);

const calcX = (data, width, readX) =>
  d3.scaleTime()
  .range([0, width])
  .domain(d3.extent(data, readX));

const calcY = (data, height, readY) =>
  d3.scaleLinear()
      .range([height, 0])
      .domain(d3.extent(data, readY));

const enter = (container, {width, height}) => {
  container.append('svg');
  return container;
}

// Renders the chart
const update = (container, series, config) => {
  const {width, height, readX, readY} = config;

  const calcD = group => {
    const {data} = group;

    const line = d3.line()
      .curve(d3.curveBasis)
      .x(compose(calcX(data, width, readX), readX))
      .y(compose(calcY(data, height, readY), readY));

    return line(data);
  }

  const svg = container.selectAll('svg')
    .attr('width', width)
    .attr('height', height)

  const group = svg.selectAll('.chart-group')
    .data(series)

  group.exit()
    .remove();

  const groupEnter = group.enter()
    .append('g')
      .classed('chart-group', true)

  groupEnter
    .append('path')
      .classed('chart-line', true)
      .style('stroke', group => group.color)

  const groupAll = groupEnter.merge(group);

  groupAll.select('.chart-line')
    .attr('d', calcD);

  // Add chart dots
  groupAll.selectAll('.chart-dot')
    // Filter down to data
    .data(group => group.data)
  .enter()
    .append('circle')
    .attr('class', 'chart-dot')
    .attr('cx', compose(calcX(data, width, readX), readX))
    .attr('cy', compose(calcY(data, height, readY), readY))
    .attr("r", 3.5)
  .exit()
    .remove();

  return svg;
}

const svg = enter(d3.select('#chart'), {
  width: 800,
  height: 300
});

const series = [
  {
    color: 'blue',
    data: data
  },
  {
    color: 'red',
    data: data2
  }
]

update(svg, series, {
  width: 800,
  height: 300,
  readX,
  readY
});