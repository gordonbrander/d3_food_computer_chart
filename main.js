const width = 600;
const height = 300;

const comp2 = (a, b) => (x) => a(b(x));

const readX = d => d.x;
const readY = d => d.y;

// var xAxis = d3.axisBottom(x);
// var yAxis = d3.axisLeft(y);

const initChart = $container => {
  $container.append('svg').append('g');
}

// Renders the chart
const chart = (chart, data, width, height, readX, readY) => {
  const svg = chart
    .append('svg')

  svg.append('g');

  svg
    .attr('width', width)
    .attr('height', height);

  svg.append('path')
    .attr('class', 'chart-line');

  svg.selectAll('.chart-line')
    .call(line, data, width, height, readX, readY);

  return svg;
}

const line = ($line, data, width, height, readX, readY) => {
  const x = d3.scaleTime()
    .range([0, width])
    .domain(d3.extent(data, readX));

  const y = d3.scaleLinear()
    .range([height, 0])
    .domain(d3.extent(data, readY));

  console.log(x(width), y(height));


  const line = d3.line()
    .x(comp2(x, readX))
    .y(comp2(y, readY));

  return $line.datum(data).attr('d', line).enter();
}

d3.select('#chart').call(chart, data, 800, 600, readX, readY);