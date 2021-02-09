(function (React$1, ReactDOM, d3, topojson) {
  'use strict';

  var React$1__default = 'default' in React$1 ? React$1['default'] : React$1;
  ReactDOM = ReactDOM && Object.prototype.hasOwnProperty.call(ReactDOM, 'default') ? ReactDOM['default'] : ReactDOM;

  const jsonUrl =
    'https://unpkg.com/world-atlas@2.0.2/countries-50m.json';

  const useWorldAtlas = () => {
    const [data, setData] = React$1.useState(null);


    React$1.useEffect(() => {
      d3.json(jsonUrl).then(topology => {
        const { countries, land } = topology.objects;
      	setData({
          land: topojson.feature(topology, land),
        	interiors: topojson.mesh(topology, countries, (a, b) => a !== b)
        });
      });
    }, []);
    
    return data;
  };

  const csvUrl =
    'https://gist.githubusercontent.com/andre6639/c40b02a85c7362bc1237b530f7988ff0/raw/c3da73ab6ba569a97f906c2a559ad2dddc2de050/MissingMigrants-ConciseGlobal-2020-11-04T23-14-14.csv';

  const row = (d) => {
    d.coords = d['Location Coordinates']
      .split(',')
      .map((d) => +d)
      .reverse();
    d['Total Dead and Missing'] = +d['Total Dead and Missing'];
    d['Reported Date'] = new Date(d['Reported Date']);
    return d;
  };

  const useData = () => {
    const [data, setData] = React$1.useState(null);

    React$1.useEffect(() => {
      d3.csv(csvUrl, row).then(setData);
    }, []);

    return data;
  };

  const projection = d3.geoNaturalEarth1();
  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule();

  const Marks = ({
    worldAtlas: { land, interiors },
    data,
    sizeScale,
    sizeValue,
  }) => (
    React.createElement( 'g', { className: "marks" },
      React$1.useMemo(
        () => (
          React.createElement( React.Fragment, null,
            React.createElement( 'path', { className: "sphere", d: path({ type: 'Sphere' }) }),
            React.createElement( 'path', { className: "graticules", d: path(graticule()) }),
            land.features.map((feature) => (
              React.createElement( 'path', { className: "land", d: path(feature) })
            )),
            React.createElement( 'path', { className: "interiors", d: path(interiors) })
          )
        ),
        [path, graticule, land, interiors]
      ),
      data.map((d) => {
        const [x, y] = projection(d.coords);
        return React.createElement( 'circle', { cx: x, cy: y, r: sizeScale(sizeValue(d)) });
      })
    )
  );

  const sizeValue = (d) => d['Total Dead and Missing'];
  const maxRadius = 15;

  const BubbleMap = ({ data, filteredData, worldAtlas }) => {
    const sizeScale = React$1.useMemo(
      () =>
        d3.scaleSqrt()
          .domain([0, d3.max(data, sizeValue)])
          .range([0, maxRadius]),
      [data, sizeValue, maxRadius]
    );

    return (
      React$1__default.createElement( Marks, {
        worldAtlas: worldAtlas, data: filteredData, sizeScale: sizeScale, sizeValue: sizeValue })
    );
  };

  const AxisBottom = ({ xScale, innerHeight, tickFormat, tickOffset = 3 }) =>
    xScale.ticks().map(tickValue => (
      React.createElement( 'g', {
        className: "tick", key: tickValue, transform: `translate(${xScale(tickValue)},0)` },
        React.createElement( 'line', { y2: innerHeight }),
        React.createElement( 'text', { style: { textAnchor: 'middle' }, dy: ".71em", y: innerHeight + tickOffset },
          tickFormat(tickValue)
        )
      )
    ));

  const AxisLeft = ({ yScale, innerWidth, tickOffset = 3 }) =>
    yScale.ticks().map(tickValue => (
      React.createElement( 'g', { className: "tick", transform: `translate(0,${yScale(tickValue)})` },
        React.createElement( 'line', { x2: innerWidth }),
        React.createElement( 'text', {
          key: tickValue, style: { textAnchor: 'end' }, x: -tickOffset, dy: ".32em" },
          tickValue
        )
      )
    ));

  const Marks$1 = ({
    binnedData,
    xScale,
    yScale,
    tooltipFormat,
    innerHeight,
  }) =>
    binnedData.map((d) => (
      React.createElement( 'rect', {
        className: "mark", x: xScale(d.x0), y: yScale(d.y), width: xScale(d.x1) - xScale(d.x0), height: innerHeight - yScale(d.y) },
        React.createElement( 'title', null, tooltipFormat(d.y) )
      )
    ));

  const margin = { top: 0, right: 30, bottom: 20, left: 45 };

  const xAxisLabelOffset = 54;
  const yAxisLabelOffset = 30;
  const xAxisTickFormat = d3.timeFormat('%m/%d/%Y');

  const xAxisLabel = 'Time';
  const yValue = (d) => d['Total Dead and Missing'];
  const yAxisLabel = 'Total Dead and Missing';

  const DateHistogram = ({
    data,
    width,
    height,
    setBrushExtent,
    xValue,
  }) => {
    const innerHeight = height - margin.top - margin.bottom;
    const innerWidth = width - margin.left - margin.right;

    const xScale = React$1.useMemo(
      () =>
        d3.scaleTime()
          .domain(d3.extent(data, xValue))
          .range([0, innerWidth])
          .nice(),
      [data, xValue, innerWidth]
    );

    const binnedData = React$1.useMemo(() => {
      const [start, stop] = xScale.domain();
      console.log('computing binnedData');
      return d3.histogram()
        .value(xValue)
        .domain(xScale.domain())
        .thresholds(d3.timeMonths(start, stop))(data)
        .map((array) => ({
          y: d3.sum(array, yValue),
          x0: array.x0,
          x1: array.x1,
        }));
    }, [xValue, yValue, xScale, data]);

    const yScale = React$1.useMemo(
      () =>
        d3.scaleLinear()
          .domain([0, d3.max(binnedData, (d) => d.y)])
          .range([innerHeight, 0]),
      [binnedData, innerHeight]
    );

    const brushRef = React$1.useRef();

    React$1.useEffect(() => {
      const brush = d3.brushX().extent([
        [0, 0],
        [innerWidth, innerHeight],
      ]);
      brush(d3.select(brushRef.current));
      brush.on('brush end', () => {
        setBrushExtent(d3.event.selection && d3.event.selection.map(xScale.invert));
      });
    }, [innerWidth, innerHeight]);

    return (
      React.createElement( React.Fragment, null,
        React.createElement( 'rect', { width: width, height: height, fill: "white" }),
        React.createElement( 'g', { transform: `translate(${margin.left},${margin.top})` },
          React.createElement( AxisBottom, {
            xScale: xScale, innerHeight: innerHeight, tickFormat: xAxisTickFormat, tickOffset: 5 }),
          React.createElement( 'text', {
            className: "axis-label", textAnchor: "middle", transform: `translate(${-yAxisLabelOffset},${
            innerHeight / 2
          }) rotate(-90)` },
            yAxisLabel
          ),
          React.createElement( AxisLeft, { yScale: yScale, innerWidth: innerWidth, tickOffset: 5 }),
          React.createElement( 'text', {
            className: "axis-label", x: innerWidth / 2, y: innerHeight + xAxisLabelOffset, textAnchor: "middle" },
            xAxisLabel
          ),
          React.createElement( Marks$1, {
            binnedData: binnedData, xScale: xScale, yScale: yScale, tooltipFormat: (d) => d, circleRadius: 2, innerHeight: innerHeight }),
          React.createElement( 'g', { ref: brushRef })
        )
      )
    );
  };

  // import {  } from 'd3';

  const width = 960;
  const height = 500;
  const dateHistogramSize = 0.224;

  const xValue = (d) => d['Reported Date'];

  const App = () => {
    const worldAtlas = useWorldAtlas();
    const data = useData();
    const [brushExtent, setBrushExtent] = React$1.useState();

    if (!worldAtlas || !data) {
      return React$1__default.createElement( 'pre', null, "Loading..." );
    }

    const filteredData = brushExtent
      ? data.filter((d) => {
          const date = xValue(d);
          return date > brushExtent[0] && date < brushExtent[1];
        })
      : data;

    return (
      React$1__default.createElement( 'svg', { width: width, height: height },
  			React$1__default.createElement( BubbleMap, {
          data: data, filteredData: filteredData, worldAtlas: worldAtlas }),
        React$1__default.createElement( 'g', { transform: `translate(0, ${height - dateHistogramSize * height})` },
          React$1__default.createElement( DateHistogram, {
            data: data, width: width, height: dateHistogramSize * height, setBrushExtent: setBrushExtent, xValue: xValue })
        )
      )
    );
  };
  const rootElement = document.getElementById('root');
  ReactDOM.render(React$1__default.createElement( App, null ), rootElement);

}(React, ReactDOM, d3, topojson));

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInVzZVdvcmxkQXRsYXMuanMiLCJ1c2VEYXRhLmpzIiwiQnViYmxlTWFwL01hcmtzLmpzIiwiQnViYmxlTWFwL2luZGV4LmpzIiwiRGF0ZUhpc3RvZ3JhbS9BeGlzQm90dG9tLmpzIiwiRGF0ZUhpc3RvZ3JhbS9BeGlzTGVmdC5qcyIsIkRhdGVIaXN0b2dyYW0vTWFya3MuanMiLCJEYXRlSGlzdG9ncmFtL2luZGV4LmpzIiwiaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBqc29uIH0gZnJvbSAnZDMnO1xuaW1wb3J0IHsgZmVhdHVyZSwgbWVzaCB9IGZyb20gJ3RvcG9qc29uJztcblxuY29uc3QganNvblVybCA9XG4gICdodHRwczovL3VucGtnLmNvbS93b3JsZC1hdGxhc0AyLjAuMi9jb3VudHJpZXMtNTBtLmpzb24nO1xuXG5leHBvcnQgY29uc3QgdXNlV29ybGRBdGxhcyA9ICgpID0+IHtcbiAgY29uc3QgW2RhdGEsIHNldERhdGFdID0gdXNlU3RhdGUobnVsbCk7XG5cblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGpzb24oanNvblVybCkudGhlbih0b3BvbG9neSA9PiB7XG4gICAgICBjb25zdCB7IGNvdW50cmllcywgbGFuZCB9ID0gdG9wb2xvZ3kub2JqZWN0cztcbiAgICBcdHNldERhdGEoe1xuICAgICAgICBsYW5kOiBmZWF0dXJlKHRvcG9sb2d5LCBsYW5kKSxcbiAgICAgIFx0aW50ZXJpb3JzOiBtZXNoKHRvcG9sb2d5LCBjb3VudHJpZXMsIChhLCBiKSA9PiBhICE9PSBiKVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sIFtdKTtcbiAgXG4gIHJldHVybiBkYXRhO1xufTsiLCJpbXBvcnQgeyB1c2VTdGF0ZSwgdXNlRWZmZWN0IH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgY3N2IH0gZnJvbSAnZDMnO1xuXG5jb25zdCBjc3ZVcmwgPVxuICAnaHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS9hbmRyZTY2MzkvYzQwYjAyYTg1YzczNjJiYzEyMzdiNTMwZjc5ODhmZjAvcmF3L2MzZGE3M2FiNmJhNTY5YTk3ZjkwNmMyYTU1OWFkMmRkZGMyZGUwNTAvTWlzc2luZ01pZ3JhbnRzLUNvbmNpc2VHbG9iYWwtMjAyMC0xMS0wNFQyMy0xNC0xNC5jc3YnO1xuXG5jb25zdCByb3cgPSAoZCkgPT4ge1xuICBkLmNvb3JkcyA9IGRbJ0xvY2F0aW9uIENvb3JkaW5hdGVzJ11cbiAgICAuc3BsaXQoJywnKVxuICAgIC5tYXAoKGQpID0+ICtkKVxuICAgIC5yZXZlcnNlKCk7XG4gIGRbJ1RvdGFsIERlYWQgYW5kIE1pc3NpbmcnXSA9ICtkWydUb3RhbCBEZWFkIGFuZCBNaXNzaW5nJ107XG4gIGRbJ1JlcG9ydGVkIERhdGUnXSA9IG5ldyBEYXRlKGRbJ1JlcG9ydGVkIERhdGUnXSk7XG4gIHJldHVybiBkO1xufTtcblxuZXhwb3J0IGNvbnN0IHVzZURhdGEgPSAoKSA9PiB7XG4gIGNvbnN0IFtkYXRhLCBzZXREYXRhXSA9IHVzZVN0YXRlKG51bGwpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY3N2KGNzdlVybCwgcm93KS50aGVuKHNldERhdGEpO1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIGRhdGE7XG59O1xuIiwiaW1wb3J0IHsgZ2VvTmF0dXJhbEVhcnRoMSwgZ2VvUGF0aCwgZ2VvR3JhdGljdWxlIH0gZnJvbSAnZDMnO1xuaW1wb3J0IHsgdXNlTWVtbyB9IGZyb20gJ3JlYWN0JztcblxuY29uc3QgcHJvamVjdGlvbiA9IGdlb05hdHVyYWxFYXJ0aDEoKTtcbmNvbnN0IHBhdGggPSBnZW9QYXRoKHByb2plY3Rpb24pO1xuY29uc3QgZ3JhdGljdWxlID0gZ2VvR3JhdGljdWxlKCk7XG5cbmV4cG9ydCBjb25zdCBNYXJrcyA9ICh7XG4gIHdvcmxkQXRsYXM6IHsgbGFuZCwgaW50ZXJpb3JzIH0sXG4gIGRhdGEsXG4gIHNpemVTY2FsZSxcbiAgc2l6ZVZhbHVlLFxufSkgPT4gKFxuICA8ZyBjbGFzc05hbWU9XCJtYXJrc1wiPlxuICAgIHt1c2VNZW1vKFxuICAgICAgKCkgPT4gKFxuICAgICAgICA8PlxuICAgICAgICAgIDxwYXRoIGNsYXNzTmFtZT1cInNwaGVyZVwiIGQ9e3BhdGgoeyB0eXBlOiAnU3BoZXJlJyB9KX0gLz5cbiAgICAgICAgICA8cGF0aCBjbGFzc05hbWU9XCJncmF0aWN1bGVzXCIgZD17cGF0aChncmF0aWN1bGUoKSl9IC8+XG4gICAgICAgICAge2xhbmQuZmVhdHVyZXMubWFwKChmZWF0dXJlKSA9PiAoXG4gICAgICAgICAgICA8cGF0aCBjbGFzc05hbWU9XCJsYW5kXCIgZD17cGF0aChmZWF0dXJlKX0gLz5cbiAgICAgICAgICApKX1cbiAgICAgICAgICA8cGF0aCBjbGFzc05hbWU9XCJpbnRlcmlvcnNcIiBkPXtwYXRoKGludGVyaW9ycyl9IC8+XG4gICAgICAgIDwvPlxuICAgICAgKSxcbiAgICAgIFtwYXRoLCBncmF0aWN1bGUsIGxhbmQsIGludGVyaW9yc11cbiAgICApfVxuICAgIHtkYXRhLm1hcCgoZCkgPT4ge1xuICAgICAgY29uc3QgW3gsIHldID0gcHJvamVjdGlvbihkLmNvb3Jkcyk7XG4gICAgICByZXR1cm4gPGNpcmNsZSBjeD17eH0gY3k9e3l9IHI9e3NpemVTY2FsZShzaXplVmFsdWUoZCkpfSAvPjtcbiAgICB9KX1cbiAgPC9nPlxuKTtcbiIsImltcG9ydCBSZWFjdCwgeyB1c2VNZW1vIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgc2NhbGVTcXJ0LCBtYXggfSBmcm9tICdkMyc7XG5pbXBvcnQgeyBNYXJrcyB9IGZyb20gJy4vTWFya3MnO1xuXG5jb25zdCBzaXplVmFsdWUgPSAoZCkgPT4gZFsnVG90YWwgRGVhZCBhbmQgTWlzc2luZyddO1xuY29uc3QgbWF4UmFkaXVzID0gMTU7XG5cbmV4cG9ydCBjb25zdCBCdWJibGVNYXAgPSAoeyBkYXRhLCBmaWx0ZXJlZERhdGEsIHdvcmxkQXRsYXMgfSkgPT4ge1xuICBjb25zdCBzaXplU2NhbGUgPSB1c2VNZW1vKFxuICAgICgpID0+XG4gICAgICBzY2FsZVNxcnQoKVxuICAgICAgICAuZG9tYWluKFswLCBtYXgoZGF0YSwgc2l6ZVZhbHVlKV0pXG4gICAgICAgIC5yYW5nZShbMCwgbWF4UmFkaXVzXSksXG4gICAgW2RhdGEsIHNpemVWYWx1ZSwgbWF4UmFkaXVzXVxuICApO1xuXG4gIHJldHVybiAoXG4gICAgPE1hcmtzXG4gICAgICB3b3JsZEF0bGFzPXt3b3JsZEF0bGFzfVxuICAgICAgZGF0YT17ZmlsdGVyZWREYXRhfVxuICAgICAgc2l6ZVNjYWxlPXtzaXplU2NhbGV9XG4gICAgICBzaXplVmFsdWU9e3NpemVWYWx1ZX1cbiAgICAvPlxuICApO1xufTsiLCJleHBvcnQgY29uc3QgQXhpc0JvdHRvbSA9ICh7IHhTY2FsZSwgaW5uZXJIZWlnaHQsIHRpY2tGb3JtYXQsIHRpY2tPZmZzZXQgPSAzIH0pID0+XG4gIHhTY2FsZS50aWNrcygpLm1hcCh0aWNrVmFsdWUgPT4gKFxuICAgIDxnXG4gICAgICBjbGFzc05hbWU9XCJ0aWNrXCJcbiAgICAgIGtleT17dGlja1ZhbHVlfVxuICAgICAgdHJhbnNmb3JtPXtgdHJhbnNsYXRlKCR7eFNjYWxlKHRpY2tWYWx1ZSl9LDApYH1cbiAgICA+XG4gICAgICA8bGluZSB5Mj17aW5uZXJIZWlnaHR9IC8+XG4gICAgICA8dGV4dCBzdHlsZT17eyB0ZXh0QW5jaG9yOiAnbWlkZGxlJyB9fSBkeT1cIi43MWVtXCIgeT17aW5uZXJIZWlnaHQgKyB0aWNrT2Zmc2V0fT5cbiAgICAgICAge3RpY2tGb3JtYXQodGlja1ZhbHVlKX1cbiAgICAgIDwvdGV4dD5cbiAgICA8L2c+XG4gICkpO1xuIiwiZXhwb3J0IGNvbnN0IEF4aXNMZWZ0ID0gKHsgeVNjYWxlLCBpbm5lcldpZHRoLCB0aWNrT2Zmc2V0ID0gMyB9KSA9PlxuICB5U2NhbGUudGlja3MoKS5tYXAodGlja1ZhbHVlID0+IChcbiAgICA8ZyBjbGFzc05hbWU9XCJ0aWNrXCIgdHJhbnNmb3JtPXtgdHJhbnNsYXRlKDAsJHt5U2NhbGUodGlja1ZhbHVlKX0pYH0+XG4gICAgICA8bGluZSB4Mj17aW5uZXJXaWR0aH0gLz5cbiAgICAgIDx0ZXh0XG4gICAgICAgIGtleT17dGlja1ZhbHVlfVxuICAgICAgICBzdHlsZT17eyB0ZXh0QW5jaG9yOiAnZW5kJyB9fVxuICAgICAgICB4PXstdGlja09mZnNldH1cbiAgICAgICAgZHk9XCIuMzJlbVwiXG4gICAgICA+XG4gICAgICAgIHt0aWNrVmFsdWV9XG4gICAgICA8L3RleHQ+XG4gICAgPC9nPlxuICApKTtcbiIsImV4cG9ydCBjb25zdCBNYXJrcyA9ICh7XG4gIGJpbm5lZERhdGEsXG4gIHhTY2FsZSxcbiAgeVNjYWxlLFxuICB0b29sdGlwRm9ybWF0LFxuICBpbm5lckhlaWdodCxcbn0pID0+XG4gIGJpbm5lZERhdGEubWFwKChkKSA9PiAoXG4gICAgPHJlY3RcbiAgICAgIGNsYXNzTmFtZT1cIm1hcmtcIlxuICAgICAgeD17eFNjYWxlKGQueDApfVxuICAgICAgeT17eVNjYWxlKGQueSl9XG4gICAgICB3aWR0aD17eFNjYWxlKGQueDEpIC0geFNjYWxlKGQueDApfVxuICAgICAgaGVpZ2h0PXtpbm5lckhlaWdodCAtIHlTY2FsZShkLnkpfVxuICAgID5cbiAgICAgIDx0aXRsZT57dG9vbHRpcEZvcm1hdChkLnkpfTwvdGl0bGU+XG4gICAgPC9yZWN0PlxuICApKTsiLCJpbXBvcnQge1xuICBzY2FsZUxpbmVhcixcbiAgc2NhbGVUaW1lLFxuICBtYXgsXG4gIHRpbWVGb3JtYXQsXG4gIGV4dGVudCxcbiAgaGlzdG9ncmFtIGFzIGJpbixcbiAgdGltZU1vbnRocyxcbiAgc3VtLFxuICBicnVzaFgsXG4gIHNlbGVjdCxcbiAgZXZlbnQsXG59IGZyb20gJ2QzJztcbmltcG9ydCB7IHVzZVJlZiwgdXNlRWZmZWN0LCB1c2VNZW1vIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQXhpc0JvdHRvbSB9IGZyb20gJy4vQXhpc0JvdHRvbSc7XG5pbXBvcnQgeyBBeGlzTGVmdCB9IGZyb20gJy4vQXhpc0xlZnQnO1xuaW1wb3J0IHsgTWFya3MgfSBmcm9tICcuL01hcmtzJztcblxuY29uc3QgbWFyZ2luID0geyB0b3A6IDAsIHJpZ2h0OiAzMCwgYm90dG9tOiAyMCwgbGVmdDogNDUgfTtcblxuY29uc3QgeEF4aXNMYWJlbE9mZnNldCA9IDU0O1xuY29uc3QgeUF4aXNMYWJlbE9mZnNldCA9IDMwO1xuY29uc3QgeEF4aXNUaWNrRm9ybWF0ID0gdGltZUZvcm1hdCgnJW0vJWQvJVknKTtcblxuY29uc3QgeEF4aXNMYWJlbCA9ICdUaW1lJztcbmNvbnN0IHlWYWx1ZSA9IChkKSA9PiBkWydUb3RhbCBEZWFkIGFuZCBNaXNzaW5nJ107XG5jb25zdCB5QXhpc0xhYmVsID0gJ1RvdGFsIERlYWQgYW5kIE1pc3NpbmcnO1xuXG5leHBvcnQgY29uc3QgRGF0ZUhpc3RvZ3JhbSA9ICh7XG4gIGRhdGEsXG4gIHdpZHRoLFxuICBoZWlnaHQsXG4gIHNldEJydXNoRXh0ZW50LFxuICB4VmFsdWUsXG59KSA9PiB7XG4gIGNvbnN0IGlubmVySGVpZ2h0ID0gaGVpZ2h0IC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b207XG4gIGNvbnN0IGlubmVyV2lkdGggPSB3aWR0aCAtIG1hcmdpbi5sZWZ0IC0gbWFyZ2luLnJpZ2h0O1xuXG4gIGNvbnN0IHhTY2FsZSA9IHVzZU1lbW8oXG4gICAgKCkgPT5cbiAgICAgIHNjYWxlVGltZSgpXG4gICAgICAgIC5kb21haW4oZXh0ZW50KGRhdGEsIHhWYWx1ZSkpXG4gICAgICAgIC5yYW5nZShbMCwgaW5uZXJXaWR0aF0pXG4gICAgICAgIC5uaWNlKCksXG4gICAgW2RhdGEsIHhWYWx1ZSwgaW5uZXJXaWR0aF1cbiAgKTtcblxuICBjb25zdCBiaW5uZWREYXRhID0gdXNlTWVtbygoKSA9PiB7XG4gICAgY29uc3QgW3N0YXJ0LCBzdG9wXSA9IHhTY2FsZS5kb21haW4oKTtcbiAgICBjb25zb2xlLmxvZygnY29tcHV0aW5nIGJpbm5lZERhdGEnKTtcbiAgICByZXR1cm4gYmluKClcbiAgICAgIC52YWx1ZSh4VmFsdWUpXG4gICAgICAuZG9tYWluKHhTY2FsZS5kb21haW4oKSlcbiAgICAgIC50aHJlc2hvbGRzKHRpbWVNb250aHMoc3RhcnQsIHN0b3ApKShkYXRhKVxuICAgICAgLm1hcCgoYXJyYXkpID0+ICh7XG4gICAgICAgIHk6IHN1bShhcnJheSwgeVZhbHVlKSxcbiAgICAgICAgeDA6IGFycmF5LngwLFxuICAgICAgICB4MTogYXJyYXkueDEsXG4gICAgICB9KSk7XG4gIH0sIFt4VmFsdWUsIHlWYWx1ZSwgeFNjYWxlLCBkYXRhXSk7XG5cbiAgY29uc3QgeVNjYWxlID0gdXNlTWVtbyhcbiAgICAoKSA9PlxuICAgICAgc2NhbGVMaW5lYXIoKVxuICAgICAgICAuZG9tYWluKFswLCBtYXgoYmlubmVkRGF0YSwgKGQpID0+IGQueSldKVxuICAgICAgICAucmFuZ2UoW2lubmVySGVpZ2h0LCAwXSksXG4gICAgW2Jpbm5lZERhdGEsIGlubmVySGVpZ2h0XVxuICApO1xuXG4gIGNvbnN0IGJydXNoUmVmID0gdXNlUmVmKCk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBicnVzaCA9IGJydXNoWCgpLmV4dGVudChbXG4gICAgICBbMCwgMF0sXG4gICAgICBbaW5uZXJXaWR0aCwgaW5uZXJIZWlnaHRdLFxuICAgIF0pO1xuICAgIGJydXNoKHNlbGVjdChicnVzaFJlZi5jdXJyZW50KSk7XG4gICAgYnJ1c2gub24oJ2JydXNoIGVuZCcsICgpID0+IHtcbiAgICAgIHNldEJydXNoRXh0ZW50KGV2ZW50LnNlbGVjdGlvbiAmJiBldmVudC5zZWxlY3Rpb24ubWFwKHhTY2FsZS5pbnZlcnQpKTtcbiAgICB9KTtcbiAgfSwgW2lubmVyV2lkdGgsIGlubmVySGVpZ2h0XSk7XG5cbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPHJlY3Qgd2lkdGg9e3dpZHRofSBoZWlnaHQ9e2hlaWdodH0gZmlsbD1cIndoaXRlXCIgLz5cbiAgICAgIDxnIHRyYW5zZm9ybT17YHRyYW5zbGF0ZSgke21hcmdpbi5sZWZ0fSwke21hcmdpbi50b3B9KWB9PlxuICAgICAgICA8QXhpc0JvdHRvbVxuICAgICAgICAgIHhTY2FsZT17eFNjYWxlfVxuICAgICAgICAgIGlubmVySGVpZ2h0PXtpbm5lckhlaWdodH1cbiAgICAgICAgICB0aWNrRm9ybWF0PXt4QXhpc1RpY2tGb3JtYXR9XG4gICAgICAgICAgdGlja09mZnNldD17NX1cbiAgICAgICAgLz5cbiAgICAgICAgPHRleHRcbiAgICAgICAgICBjbGFzc05hbWU9XCJheGlzLWxhYmVsXCJcbiAgICAgICAgICB0ZXh0QW5jaG9yPVwibWlkZGxlXCJcbiAgICAgICAgICB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoJHsteUF4aXNMYWJlbE9mZnNldH0sJHtcbiAgICAgICAgICAgIGlubmVySGVpZ2h0IC8gMlxuICAgICAgICAgIH0pIHJvdGF0ZSgtOTApYH1cbiAgICAgICAgPlxuICAgICAgICAgIHt5QXhpc0xhYmVsfVxuICAgICAgICA8L3RleHQ+XG4gICAgICAgIDxBeGlzTGVmdCB5U2NhbGU9e3lTY2FsZX0gaW5uZXJXaWR0aD17aW5uZXJXaWR0aH0gdGlja09mZnNldD17NX0gLz5cbiAgICAgICAgPHRleHRcbiAgICAgICAgICBjbGFzc05hbWU9XCJheGlzLWxhYmVsXCJcbiAgICAgICAgICB4PXtpbm5lcldpZHRoIC8gMn1cbiAgICAgICAgICB5PXtpbm5lckhlaWdodCArIHhBeGlzTGFiZWxPZmZzZXR9XG4gICAgICAgICAgdGV4dEFuY2hvcj1cIm1pZGRsZVwiXG4gICAgICAgID5cbiAgICAgICAgICB7eEF4aXNMYWJlbH1cbiAgICAgICAgPC90ZXh0PlxuICAgICAgICA8TWFya3NcbiAgICAgICAgICBiaW5uZWREYXRhPXtiaW5uZWREYXRhfVxuICAgICAgICAgIHhTY2FsZT17eFNjYWxlfVxuICAgICAgICAgIHlTY2FsZT17eVNjYWxlfVxuICAgICAgICAgIHRvb2x0aXBGb3JtYXQ9eyhkKSA9PiBkfVxuICAgICAgICAgIGNpcmNsZVJhZGl1cz17Mn1cbiAgICAgICAgICBpbm5lckhlaWdodD17aW5uZXJIZWlnaHR9XG4gICAgICAgIC8+XG4gICAgICAgIDxnIHJlZj17YnJ1c2hSZWZ9IC8+XG4gICAgICA8L2c+XG4gICAgPC8+XG4gICk7XG59O1xuIiwiLy8gaW1wb3J0IHsgIH0gZnJvbSAnZDMnO1xuaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IFJlYWN0RE9NIGZyb20gJ3JlYWN0LWRvbSc7XG5pbXBvcnQgeyB1c2VXb3JsZEF0bGFzIH0gZnJvbSAnLi91c2VXb3JsZEF0bGFzJztcbmltcG9ydCB7IHVzZURhdGEgfSBmcm9tICcuL3VzZURhdGEnO1xuaW1wb3J0IHsgQnViYmxlTWFwIH0gZnJvbSAnLi9CdWJibGVNYXAvaW5kZXguanMnO1xuaW1wb3J0IHsgRGF0ZUhpc3RvZ3JhbSB9IGZyb20gJy4vRGF0ZUhpc3RvZ3JhbS9pbmRleC5qcyc7XG5cbmNvbnN0IHdpZHRoID0gOTYwO1xuY29uc3QgaGVpZ2h0ID0gNTAwO1xuY29uc3QgZGF0ZUhpc3RvZ3JhbVNpemUgPSAwLjIyNDtcblxuY29uc3QgeFZhbHVlID0gKGQpID0+IGRbJ1JlcG9ydGVkIERhdGUnXTtcblxuY29uc3QgQXBwID0gKCkgPT4ge1xuICBjb25zdCB3b3JsZEF0bGFzID0gdXNlV29ybGRBdGxhcygpO1xuICBjb25zdCBkYXRhID0gdXNlRGF0YSgpO1xuICBjb25zdCBbYnJ1c2hFeHRlbnQsIHNldEJydXNoRXh0ZW50XSA9IHVzZVN0YXRlKCk7XG5cbiAgaWYgKCF3b3JsZEF0bGFzIHx8ICFkYXRhKSB7XG4gICAgcmV0dXJuIDxwcmU+TG9hZGluZy4uLjwvcHJlPjtcbiAgfVxuXG4gIGNvbnN0IGZpbHRlcmVkRGF0YSA9IGJydXNoRXh0ZW50XG4gICAgPyBkYXRhLmZpbHRlcigoZCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0geFZhbHVlKGQpO1xuICAgICAgICByZXR1cm4gZGF0ZSA+IGJydXNoRXh0ZW50WzBdICYmIGRhdGUgPCBicnVzaEV4dGVudFsxXTtcbiAgICAgIH0pXG4gICAgOiBkYXRhO1xuXG4gIHJldHVybiAoXG4gICAgPHN2ZyB3aWR0aD17d2lkdGh9IGhlaWdodD17aGVpZ2h0fT5cblx0XHRcdDxCdWJibGVNYXBcbiAgICAgICAgZGF0YT17ZGF0YX1cbiAgICAgICAgZmlsdGVyZWREYXRhPXtmaWx0ZXJlZERhdGF9XG4gICAgICAgIHdvcmxkQXRsYXM9e3dvcmxkQXRsYXN9XG4gICAgICAvPlxuICAgICAgPGcgdHJhbnNmb3JtPXtgdHJhbnNsYXRlKDAsICR7aGVpZ2h0IC0gZGF0ZUhpc3RvZ3JhbVNpemUgKiBoZWlnaHR9KWB9PlxuICAgICAgICA8RGF0ZUhpc3RvZ3JhbVxuICAgICAgICAgIGRhdGE9e2RhdGF9XG4gICAgICAgICAgd2lkdGg9e3dpZHRofVxuICAgICAgICAgIGhlaWdodD17ZGF0ZUhpc3RvZ3JhbVNpemUgKiBoZWlnaHR9XG4gICAgICAgICAgc2V0QnJ1c2hFeHRlbnQ9e3NldEJydXNoRXh0ZW50fVxuICAgICAgICAgIHhWYWx1ZT17eFZhbHVlfVxuICAgICAgICAvPlxuICAgICAgPC9nPlxuICAgIDwvc3ZnPlxuICApO1xufTtcbmNvbnN0IHJvb3RFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jvb3QnKTtcblJlYWN0RE9NLnJlbmRlcig8QXBwIC8+LCByb290RWxlbWVudCk7XG4iXSwibmFtZXMiOlsidXNlU3RhdGUiLCJ1c2VFZmZlY3QiLCJqc29uIiwiZmVhdHVyZSIsIm1lc2giLCJjc3YiLCJnZW9OYXR1cmFsRWFydGgxIiwiZ2VvUGF0aCIsImdlb0dyYXRpY3VsZSIsInVzZU1lbW8iLCJzY2FsZVNxcnQiLCJtYXgiLCJSZWFjdCIsIk1hcmtzIiwidGltZUZvcm1hdCIsInNjYWxlVGltZSIsImV4dGVudCIsImJpbiIsInRpbWVNb250aHMi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