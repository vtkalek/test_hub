/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/// <reference path="../_references.ts"/>

module powerbi.visuals {
    import EnumExtensions = jsCommon.EnumExtensions;

    export interface LineChartConstructorOptions {
        isScrollable: boolean;
        chartType?: LineChartType;
        interactivityService?: IInteractivityService;
        animator?: IAnimator;
    }

    export interface ILineChartConfiguration {
        xAxisProperties: IAxisProperties;
        yAxisProperties: IAxisProperties;
        margin: any;
    }

    export interface LineChartData extends CartesianData {
        series: LineChartSeries[];
        isScalar?: boolean;
        dataLabelsSettings: PointDataLabelsSettings;
        axesLabels: ChartAxesLabels;
        hasDynamicSeries?: boolean;
        hasSelection: boolean;
    }

    export interface LineChartSeries extends CartesianSeries, SelectableDataPoint {
        key: string;
        lineIndex: number;
        color: string;
        xCol: DataViewMetadataColumn;
        yCol: DataViewMetadataColumn;
        data: LineChartDataPoint[];
    }

    export interface LineChartDataPoint extends CartesianDataPoint, TooltipEnabledDataPoint, SelectableDataPoint, LabelEnabledDataPoint {
        categoryValue: any;
        value: number;
        categoryIndex: number;
        seriesIndex: number;
        key: string;
    }

    export const enum LineChartType {
        default = 1,
        area = 2,
        smooth = 4,
        lineShadow = 8
    }

    /** 
     * Renders a data series as a line visual.
     */
    export class LineChart implements ICartesianVisual, IInteractiveVisual {
        private static ClassName = 'lineChart';
        private static MainGraphicsContextClassName = 'mainGraphicsContext';
        private static CategoryClassName = 'cat';
        private static CategoryClassSelector = '.cat';
        private static CategoryValuePoint: ClassAndSelector = {
            class: 'dot',
            selector: '.dot'
        };
        private static CategoryAreaClassName = 'catArea';
        private static CategoryAreaClassSelector = '.catArea';
        private static HorizontalShift = 0;
        private static CircleRadius = 4;
        private static PathElementName = 'path';
        private static CircleElementName = 'circle';
        private static CircleClassName = 'selection-circle';
        private static LineElementName = 'line';
        public static AreaFillOpacity = 0.4;
        public static DimmedAreaFillOpacity = 0.2;

        private isInteractiveChart: boolean;
        private isScrollable: boolean;

        private element: JQuery;
        private mainGraphicsContext: D3.Selection;
        private clearCatcher: D3.Selection;
        private mainGraphicsSVG: D3.Selection;
        private toolTipContext: D3.Selection;
        private options: CartesianVisualInitOptions;
        private dataViewCat: DataViewCategorical;

        private colors: IDataColorPalette;
        private host: IVisualHostServices;
        private data: LineChartData;
        private clippedData: LineChartData;
        private lineType: LineChartType;
        private cartesianVisualHost: ICartesianVisualHost;

        private xAxisProperties: IAxisProperties;
        private yAxisProperties: IAxisProperties;
        private margin: IMargin;
        private currentViewport: IViewport;

        private selectionCircles: D3.Selection[];
        private dragHandle: D3.Selection;
        private hoverLine: D3.Selection;
        private lastInteractiveSelectedColumnIndex: number;

        private interactivityService: IInteractivityService;
        private animator: IAnimator;

        public static customizeQuery(options: CustomizeQueryOptions): void {
            var dataViewMapping = options.dataViewMappings[0];
            if (!dataViewMapping || !dataViewMapping.categorical || !dataViewMapping.categorical.categories)
                return;

            var dataViewCategories = <data.CompiledDataViewRoleForMappingWithReduction>dataViewMapping.categorical.categories;
            var categoryItems = dataViewCategories.for.in.items;
            if (!jsCommon.ArrayExtensions.isUndefinedOrEmpty(categoryItems)) {
                var categoryType = categoryItems[0].type;

                var objects: DataViewObjects;
                if (dataViewMapping.metadata)
                    objects = dataViewMapping.metadata.objects;

                if (CartesianChart.getIsScalar(objects, lineChartProps.categoryAxis.axisType, categoryType))
                    dataViewCategories.dataReductionAlgorithm = { sample: {} };
            }
        }

        public static getSortableRoles(options: VisualSortableOptions): string[] {
            var dataViewMapping = options.dataViewMappings[0];
            if (!dataViewMapping || !dataViewMapping.categorical || !dataViewMapping.categorical.categories)
                return null;

            var dataViewCategories = <data.CompiledDataViewRoleForMappingWithReduction>dataViewMapping.categorical.categories;
            var categoryItems = dataViewCategories.for.in.items;

            if (!jsCommon.ArrayExtensions.isUndefinedOrEmpty(categoryItems)) {
                var categoryType = categoryItems[0].type;

                var objects: DataViewObjects;
                if (dataViewMapping.metadata)
                    objects = dataViewMapping.metadata.objects;

                //TODO: line chart should be sortable by X if it has scalar axis
                // But currently it doesn't support this. Always return 'category' 
                // once it is supported.
                if (!CartesianChart.getIsScalar(objects, lineChartProps.categoryAxis.axisType, categoryType))
                    return ['Category'];
            }

            return null;
        }

        public static converter(dataView: DataView, blankCategoryValue: string, colors: IDataColorPalette, isScalar: boolean, interactivityService?: IInteractivityService): LineChartData {
            var categorical = dataView.categorical;
            var category = categorical.categories && categorical.categories.length > 0
                ? categorical.categories[0]
                : {
                    source: undefined,
                    values: [blankCategoryValue],
                    identity: undefined,
                };

            var xAxisCardProperties = CartesianHelper.getCategoryAxisProperties(dataView.metadata);
            isScalar = CartesianHelper.isScalar(isScalar, xAxisCardProperties);
            categorical = ColumnUtil.applyUserMinMax(isScalar, categorical, xAxisCardProperties);

            var formatStringProp = lineChartProps.general.formatString;
            var categoryType: ValueType = AxisHelper.getCategoryValueType(category.source, isScalar);
            var isDateTime = AxisHelper.isDateTime(categoryType);
            var categoryValues = category.values;
            var series: LineChartSeries[] = [];
            var seriesLen = categorical.values ? categorical.values.length : 0;
            var hasDynamicSeries = !!(categorical.values && categorical.values.source);
            var values = categorical.values;
            var dataLabelsSettings: PointDataLabelsSettings = dataLabelUtils.getDefaultPointLabelSettings();

            if (dataView.metadata && dataView.metadata.objects) {
                var objects = dataView.metadata.objects;

                var labelsObj = <DataLabelObject>objects['labels'];
                if (labelsObj) {
                    if (labelsObj.show !== undefined)
                        dataLabelsSettings.show = labelsObj.show;
                    if (labelsObj.color !== undefined) {
                        dataLabelsSettings.labelColor = labelsObj.color.solid.color;
                    }
                    if (labelsObj.labelDisplayUnits !== undefined) {
                        dataLabelsSettings.displayUnits = labelsObj.labelDisplayUnits;
                    }
                    if (labelsObj.labelPrecision !== undefined) {
                        dataLabelsSettings.precision = (labelsObj.labelPrecision >= 0) ? labelsObj.labelPrecision : 0;
                    }
                }
            }

            var colorHelper = new ColorHelper(colors, lineChartProps.dataPoint.fill);

            var grouped: DataViewValueColumnGroup[];
            if (dataView.categorical.values)
                grouped = dataView.categorical.values.grouped();

            for (var seriesIndex = 0; seriesIndex < seriesLen; seriesIndex++) {
                var column = categorical.values[seriesIndex];
                var valuesMetadata = column.source;
                var dataPoints: LineChartDataPoint[] = [];
                var groupedIdentity = grouped[seriesIndex];
                var identity = hasDynamicSeries && groupedIdentity ?
                    SelectionId.createWithIdAndMeasure(groupedIdentity.identity, column.source.queryName) :
                    SelectionId.createWithMeasure(column.source.queryName);
                var key = identity.getKey();
                var color = this.getColor(colorHelper, hasDynamicSeries, values, grouped, seriesIndex, groupedIdentity);

                for (var categoryIndex = 0, len = column.values.length; categoryIndex < len; categoryIndex++) {
                    var categoryValue = categoryValues[categoryIndex];
                    var value = AxisHelper.normalizeNonFiniteNumber(column.values[categoryIndex]);

                    // When Scalar, skip null categories and null values so we draw connected lines and never draw isolated dots.
                    if (isScalar && (categoryValue == null || value == null))
                        continue;

                    var categorical: DataViewCategorical = dataView.categorical;
                    var tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, categorical.categories, categoryValue, categorical.values, value, null, seriesIndex);

                    dataPoints.push({
                        categoryValue: isDateTime && categoryValue ? categoryValue.getTime() : categoryValue,
                        value: value,
                        categoryIndex: categoryIndex,
                        seriesIndex: seriesIndex,
                        tooltipInfo: tooltipInfo,
                        selected: false,
                        identity: identity,
                        key: JSON.stringify({ ser: key, catIdx: categoryIndex }),
                        labelFill: dataLabelsSettings.labelColor,
                        labelFormatString: valuesMetadata.format,
                    });
                }

                if (interactivityService) {
                    interactivityService.applySelectionStateToData(dataPoints);
                }

                if (dataPoints.length > 0) {
                    series.push({
                        key: key,
                        lineIndex: seriesIndex,
                        color: color,
                        xCol: category.source,
                        yCol: column.source,
                        data: dataPoints,
                        identity: identity,
                        selected: false,
                    });
                }
            }

            var xAxisCardProperties = CartesianHelper.getCategoryAxisProperties(dataView.metadata);
            var valueAxisProperties = CartesianHelper.getValueAxisProperties(dataView.metadata);
             
            // Convert to DataViewMetadataColumn
            var valuesMetadataArray: powerbi.DataViewMetadataColumn[] = [];
            if (values) {
                for (var i = 0; i < values.length; i++) {

                    if (values[i] && values[i].source && values[i].source.displayName) {
                        valuesMetadataArray.push({ displayName: values[i].source.displayName });
                    }
                }
            }

            var axesLabels = converterHelper.createAxesLabels(xAxisCardProperties, valueAxisProperties, category.source, valuesMetadataArray);
            var hasSelection: boolean = false;
            if (interactivityService) {
                if (interactivityService.applySelectionStateToData(series))
                    hasSelection = true;
            }

            return {
                series: series,
                isScalar: isScalar,
                dataLabelsSettings: dataLabelsSettings,
                axesLabels: { x: axesLabels.xAxisLabel, y: axesLabels.yAxisLabel },
                hasDynamicSeries: hasDynamicSeries,
                hasSelection: hasSelection,
                categoryMetadata: category.source,
                categories: categoryValues,
            };
        }

        public static getInteractiveLineChartDomElement(element: JQuery): HTMLElement {
            return element.children("svg").get(0);
        }

        private static getColor(
            colorHelper: ColorHelper,
            hasDynamicSeries: boolean,
            values: DataViewValueColumns,
            grouped: DataViewValueColumnGroup[],
            seriesIndex: number,
            groupedIdentity: DataViewValueColumnGroup): string {

            var objects: DataViewObjects;
            if (hasDynamicSeries) {
                if (grouped && grouped[seriesIndex])
                    objects = grouped[seriesIndex].objects;
            }
            else if (values[seriesIndex]) {
                objects = values[seriesIndex].source.objects;
            }

            return hasDynamicSeries && groupedIdentity 
                ? colorHelper.getColorForSeriesValue(objects, values.identityFields, groupedIdentity.name)
                : colorHelper.getColorForMeasure(objects, values[seriesIndex].source.queryName);
        }

        constructor(options: LineChartConstructorOptions) {
            this.isScrollable = options.isScrollable ? options.isScrollable : false;
            this.lineType = options.chartType ? options.chartType : LineChartType.default;
            this.interactivityService = options.interactivityService;
            this.animator = options.animator;
        }

        public init(options: CartesianVisualInitOptions) {
            this.options = options;
            var element = this.element = options.element;
            this.host = options.host;
            this.currentViewport = options.viewport;
            this.colors = options.style.colorPalette.dataColors;
            this.isInteractiveChart = options.interactivity && options.interactivity.isInteractiveLegend;
            this.cartesianVisualHost = options.cartesianHost;

            element.addClass(LineChart.ClassName);

            var svg = options.svg;
            this.clearCatcher = svg.select(".clearCatcher");

            this.mainGraphicsSVG = svg.append('svg')
                .classed('lineChartSVG', true)
                .style('overflow', 'visible');
            this.mainGraphicsContext = this.mainGraphicsSVG
                .append('svg')
                .style('overflow', 'hidden')
                .append('g')
                .classed(LineChart.MainGraphicsContextClassName, true);

            this.toolTipContext = svg.append('g')
                .classed('hover-line', true);

            this.toolTipContext.append(LineChart.LineElementName)
                .attr("x1", 0).attr("x2", 0)
                .attr("y1", 0).attr("y2", 0);

            var hoverLine = this.hoverLine = this.toolTipContext.select(LineChart.LineElementName);
            if (this.isInteractiveChart) {
                hoverLine.classed('interactive', true);
            }

            // define circles object - which will hold the handle circles. 
            // this object will be populated on render() function, with number of circles which matches the nubmer of lines.
            // in init(), this method, we don't have the data yet.
            this.selectionCircles = [];

            var callout = AxisHelper.ToolTip.createCallout();
            this.element.append(callout);

            hoverLine.style('opacity', SVGUtil.AlmostZero);
            callout.css('opacity', SVGUtil.AlmostZero);

            var that = this;

            this.xAxisProperties = {
                axis: null,
                scale: null,
                axisType: null,
                formatter: null,
                graphicsContext: null,
                values: null,
                axisLabel: null,
                isCategoryAxis: true
            };

            var dragMove = function () {
                var x: number = d3.mouse(this)[0];

                var index: number = that.findIndex(x);
                that.selectColumn(index);
            };

            if (this.isInteractiveChart) {
                var lineChartSvg: EventTarget = LineChart.getInteractiveLineChartDomElement(this.element);
                // assign drag and onClick events
                var drag = d3.behavior.drag()
                    .origin(Object)
                    .on("drag", dragMove);
                svg.call(drag);
                d3.select(lineChartSvg).call(drag);
                svg.on('click', dragMove);
                d3.select(lineChartSvg).on('click', dragMove);
            }
        }

        public setData(dataViews: DataView[]): void {
            this.data = {
                series: [],
                dataLabelsSettings: dataLabelUtils.getDefaultPointLabelSettings(),
                axesLabels: { x: null, y: null },
                hasDynamicSeries: false,
                hasSelection: false,
                categories: [],
                categoryMetadata: undefined,
            };

            if (dataViews.length > 0) {
                var dataView = dataViews[0];

                if (dataView) {
                    if (dataView.categorical) {
                        var dataViewCat = this.dataViewCat = dataView.categorical;
                        var dvCategories = dataViewCat.categories;
                        var categoryType = ValueType.fromDescriptor({ text: true });
                        if (dvCategories && dvCategories.length > 0 && dvCategories[0].source && dvCategories[0].source.type)
                            categoryType = dvCategories[0].source.type;

                        var convertedData = LineChart.converter(
                            dataView,
                            valueFormatter.format(null),
                            this.cartesianVisualHost.getSharedColors(),
                            CartesianChart.getIsScalar(dataView.metadata ? dataView.metadata.objects : null, lineChartProps.categoryAxis.axisType, categoryType),
                            this.interactivityService);
                        this.data = convertedData;
                    }
                }
            }
        }

        public calculateLegend(): LegendData {
            return this.createLegendDataPoints(0); // start with index 0 
        }

        public hasLegend(): boolean {
            return this.data && (this.data.hasDynamicSeries || (this.data.series && this.data.series.length > 1));
        }

        public setFilteredData(startIndex: number, endIndex: number): CartesianData {
            var catgSize = endIndex - startIndex;
            var data = this.clippedData = Prototype.inherit(this.data);
            data.series = LineChart.sliceSeries(data.series, catgSize, startIndex);
            data.categories = data.categories.slice(startIndex, endIndex);
            return data;
        }

        public calculateAxesProperties(options: CalculateScaleAndDomainOptions): IAxisProperties[] {
            var data = this.data;
            var viewport = options.viewport;
            var margin = options.margin;
            this.currentViewport = viewport;
            this.margin = margin;

            var origCatgSize = data.series && data.series.length > 0 ? data.series[0].data.length : 0;
            var categoryWidth = CartesianChart.MinOrdinalRectThickness;
            var isScalar = this.data.isScalar;

            var preferredPlotArea = this.getPreferredPlotArea(isScalar, origCatgSize, categoryWidth);

            /* preferredPlotArea would be same as currentViewport width when there is no scrollbar. 
              In that case we want to calculate the available plot area for the shapes by subtracting the margin from available viewport */
            if (preferredPlotArea.width === this.currentViewport.width) {
                preferredPlotArea.width -= (margin.left + margin.right);
            }
            preferredPlotArea.height -= (margin.top + margin.bottom);

            this.clippedData = undefined;
            if (data && !isScalar && !this.isScrollable) {
                // trim data that doesn't fit on dashboard
                var categoryCount = this.getCategoryCount(origCatgSize);
                var catgSize = Math.min(origCatgSize, categoryCount);

                if (catgSize !== origCatgSize) {
                    data = this.clippedData = Prototype.inherit(data);
                    this.clippedData.series = LineChart.sliceSeries(data.series, catgSize);
                }
            }

            var xMetaDataColumn: DataViewMetadataColumn;
            var yMetaDataColumn: DataViewMetadataColumn;
            if (data.series && data.series.length > 0) {
                xMetaDataColumn = data.series[0].xCol;
                yMetaDataColumn = data.series[0].yCol;
            }

            var valueDomain = AxisHelper.createValueDomain(data.series, false);
            var combinedDomain = AxisHelper.combineDomain(options.forcedYDomain, valueDomain);
            this.yAxisProperties = AxisHelper.createAxis({
                pixelSpan: preferredPlotArea.height,
                dataDomain: combinedDomain,
                metaDataColumn: yMetaDataColumn,
                formatStringProp: lineChartProps.general.formatString,
                outerPadding: 0,
                isScalar: true,
                isVertical: true,
                forcedTickCount: options.forcedTickCount,
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: false,
                shouldClamp: AxisHelper.scaleShouldClamp(combinedDomain, valueDomain)
            });

            var xDomain = AxisHelper.createDomain(data.series, this.xAxisProperties.axisType, this.data.isScalar, options.forcedXDomain);
            this.xAxisProperties = AxisHelper.createAxis({
                pixelSpan: preferredPlotArea.width,
                dataDomain: xDomain,
                metaDataColumn: xMetaDataColumn,
                formatStringProp: lineChartProps.general.formatString,
                outerPadding: 0,
                isScalar: this.data.isScalar,
                isVertical: false,
                forcedTickCount: options.forcedTickCount,
                useTickIntervalForDisplayUnits: true,
                getValueFn: (index, type) => this.lookupXValue(index, type),
                categoryThickness: CartesianChart.getCategoryThickness(data.series, origCatgSize, this.getAvailableWidth(), xDomain, isScalar),
                isCategoryAxis: true
            });

            this.xAxisProperties.axisLabel = options.showCategoryAxisLabel ? data.axesLabels.x : null;
            this.yAxisProperties.axisLabel = options.showValueAxisLabel ? data.axesLabels.y : null;

            return [this.xAxisProperties, this.yAxisProperties];
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            switch (options.objectName) {
                case 'dataPoint':
                    return this.enumerateDataPoints();
                case 'labels':
                    return dataLabelUtils.enumerateDataLabels(this.data.dataLabelsSettings, false, true, true);
            }
        }

        private enumerateDataPoints(): VisualObjectInstance[] {
            var data = this.data;
            if (!data || !data.series || data.series.length === 0)
                return;

            var instances: VisualObjectInstance[] = [];

            var formatStringProp = lineChartProps.general.formatString;
            var singleSeriesData = data.series;
            var seriesLength = singleSeriesData.length;

            for (var i = 0; i < seriesLength; i++) {
                var selector = ColorHelper.normalizeSelector(singleSeriesData[i].identity.getSelector());

                var label = converterHelper.getFormattedLegendLabel(singleSeriesData[i].yCol, this.dataViewCat.values, formatStringProp);
                instances.push({
                    objectName: 'dataPoint',
                    displayName: label,
                    selector: selector,
                    properties: {
                        fill: { solid: { color: singleSeriesData[i].color } }
                    },
                });
            }
            return instances;
        }

        public overrideXScale(xProperties: IAxisProperties): void {
            this.xAxisProperties = xProperties;
        }

        public onClearSelection(): void {
            if (this.interactivityService)
                this.interactivityService.clearSelection();
        }

        public render(suppressAnimations: boolean): void {
            var duration = AnimatorCommon.GetAnimationDuration(this.animator, suppressAnimations);
            if (!this.isInteractiveChart) // If we're not a mobile interactive chart, use the new render path
                this.renderNew(duration);
            else // If not, use the old path kept around for mobile compatibility until mobile code can be moved and tested within the new render path
                this.renderOld(duration);

            // This should always be the last line in the render code.
            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);
        }

        private renderNew(duration: number): void {
            var data = this.clippedData ? this.clippedData : this.data;
            if (!data)
                return;

            var margin = this.margin;
            var viewport = this.currentViewport;
            var height = viewport.height - (margin.top + margin.bottom);
            var xScale = this.xAxisProperties.scale;
            var yScale = this.yAxisProperties.scale;

            var hasSelection = data.hasSelection;
            var renderAreas: boolean = EnumExtensions.hasFlag(this.lineType, LineChartType.area);

            var area;
            if (renderAreas) {
                area = d3.svg.area()
                    .x((d: LineChartDataPoint) => { return xScale(this.getXValue(d)); })
                    .y0(height)
                    .y1((d: LineChartDataPoint) => { return yScale(d.value); })
                    .defined((d: LineChartDataPoint) => { return d.value !== null; });
            }

            var line = d3.svg.line()
                .x((d: LineChartDataPoint) => {
                    return xScale(this.getXValue(d));
                })
                .y((d: LineChartDataPoint) => {
                    return yScale(d.value);
                })
                .defined((d: LineChartDataPoint) => {
                    return d.value !== null;
                });

            if (EnumExtensions.hasFlag(this.lineType, LineChartType.smooth)) {
                line.interpolate('basis');
                if (area) {
                    area.interpolate('basis');
                }
            }

            var extraLineShift = this.extraLineShift();

            this.mainGraphicsContext.attr('transform', SVGUtil.translate(LineChart.HorizontalShift + extraLineShift, 0));

            this.mainGraphicsContext.attr('height', this.getAvailableHeight())
                .attr('width', this.getAvailableWidth());
            this.toolTipContext.attr('transform', SVGUtil.translate(LineChart.HorizontalShift + extraLineShift, 0));

            // Render Areas
            if (renderAreas) {
                var areas = this.mainGraphicsContext.selectAll(LineChart.CategoryAreaClassSelector).data(data.series, (d: LineChartSeries) => d.identity.getKey());
                areas.enter()
                    .append(LineChart.PathElementName)
                    .classed(LineChart.CategoryAreaClassName, true);
                areas
                    .style('fill', (d: LineChartSeries) => d.color)
                    .style('fill-opacity', (d: LineChartSeries) => (hasSelection && !d.selected) ? LineChart.DimmedAreaFillOpacity : LineChart.AreaFillOpacity)
                    .transition()
                    .ease('linear')
                    .duration(duration)
                    .attr('d', (d: LineChartSeries) => area(d.data));
                areas.exit()
                    .remove();
            }
            
            // Render Lines
            var lines = this.mainGraphicsContext.selectAll(".line").data(data.series, (d: LineChartSeries) => d.identity.getKey());
            lines.enter()
                .append(LineChart.PathElementName)
                .classed('line', true);
            lines
                .style('stroke', (d: LineChartSeries) => d.color)
                .style('stroke-opacity', (d: LineChartSeries) => ColumnUtil.getFillOpacity(d.selected, false, hasSelection, false))
                .transition()
                .ease('linear')
                .duration(duration)
                .attr('d', (d: LineChartSeries) => {
                    return line(d.data);
                });
            lines.exit()
                .remove();            

            // Render extra lines that are wider and invisible used for better interactivity
            var interactivityLines = this.mainGraphicsContext.selectAll(".interactivity-line").data(data.series, (d: LineChartSeries) => d.identity.getKey());
            interactivityLines.enter()
                .append(LineChart.PathElementName)
                .classed('interactivity-line', true);
            interactivityLines
                .attr('d', (d: LineChartSeries) => {
                    return line(d.data);
                });
            interactivityLines.exit()
                .remove();

            // Prepare grouping for dots
            var dotGroups = this.mainGraphicsContext.selectAll(LineChart.CategoryClassSelector)
                .data(data.series, (d: LineChartSeries) => d.identity.getKey());

            dotGroups.enter()
                .append('g')
                .classed(LineChart.CategoryClassName, true);

            dotGroups.exit()
                .remove();

            // Render dots
            var dots = dotGroups.selectAll(LineChart.CategoryValuePoint.selector)
                .data((series: LineChartSeries) => {
                    return series.data.filter((value: LineChartDataPoint, i: number) => {
                        return this.shouldDrawCircle(series, i);
                    });
                }, (d: LineChartDataPoint) => d.key);
            dots.enter()
                .append(LineChart.CircleElementName)
                .classed(LineChart.CategoryValuePoint.class, true);
            dots
                .style('fill', function () {
                    var lineSeries = d3.select(this.parentNode).datum();
                    return lineSeries.color;
                })
                .style('fill-opacity', function () {
                    var lineSeries = d3.select(this.parentNode).datum();
                    return ColumnUtil.getFillOpacity(lineSeries.selected, false, hasSelection, false);
                })
                .transition()
                .duration(duration)
                .attr({
                    cx: (d: LineChartDataPoint, i: number) => xScale(this.getXValue(d)),
                    cy: (d: LineChartDataPoint, i: number) => yScale(d.value),
                    r: LineChart.CircleRadius
                });
            dots.exit()
                .remove();

            // Add data labels
            if (data.dataLabelsSettings.show) {
                var layout = dataLabelUtils.getLineChartLabelLayout(xScale, yScale, data.dataLabelsSettings, data.isScalar, this.yAxisProperties.formatter);
                var dataPoints: LineChartDataPoint[] = [];

                for (var i = 0, ilen = data.series.length; i < ilen; i++) {
                    Array.prototype.push.apply(dataPoints, data.series[i].data);
                }

                dataLabelUtils.drawDefaultLabelsForDataPointChart(dataPoints, this.mainGraphicsSVG, layout, this.currentViewport);
                this.mainGraphicsSVG.select('.labels').attr('transform', SVGUtil.translate(LineChart.HorizontalShift + extraLineShift, 0));
            }
            else {
                dataLabelUtils.cleanDataLabels(this.mainGraphicsSVG);
            }

            // Add tooltips
            var seriesTooltipApplier = (tooltipEvent: TooltipEvent) => {
                var pointX: number = tooltipEvent.elementCoordinates[0];
                return LineChart.getTooltipInfoByPointX(this, tooltipEvent.data, pointX);
            };
            TooltipManager.addTooltip(interactivityLines, seriesTooltipApplier, true);
            if (renderAreas)
                TooltipManager.addTooltip(areas, seriesTooltipApplier, true);
            TooltipManager.addTooltip(dots, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo, true);

            // Register interactivity
            if (this.interactivityService) {
                var dataPointsToBind: SelectableDataPoint[] = data.series.slice();
                for (var i = 0, ilen = data.series.length; i < ilen; i++) {
                    dataPointsToBind = dataPointsToBind.concat(data.series[i].data);
                }
                var options: LineChartBehaviorOptions = {
                    dataPoints: dataPointsToBind,
                    lines: lines,
                    interactivityLines: interactivityLines,
                    dots: dots,
                    areas: areas,
                    background: d3.selectAll(this.element.toArray()),
                    clearCatcher: this.clearCatcher,
                };
                this.interactivityService.apply(this, options);
            }
        }

        private renderOld(duration: number): void {
            var data = this.clippedData ? this.clippedData : this.data;
            if (!data)
                return;

            var margin = this.margin;
            var viewport = this.currentViewport;
            var height = viewport.height - (margin.top + margin.bottom);
            var xScale = this.xAxisProperties.scale;
            var yScale = this.yAxisProperties.scale;

            var hasSelection = this.data.hasSelection;

            var area;
            if (EnumExtensions.hasFlag(this.lineType, LineChartType.area)) {
                area = d3.svg.area()
                    .x((d: LineChartDataPoint) => { return xScale(this.getXValue(d)); })
                    .y0(height)
                    .y1((d: LineChartDataPoint) => { return yScale(d.value); })
                    .defined((d: LineChartDataPoint) => { return d.value !== null; });
            }

            var line = d3.svg.line()
                .x((d: LineChartDataPoint) => {
                    return xScale(this.getXValue(d));
                })
                .y((d: LineChartDataPoint) => {
                    return yScale(d.value);
                })
                .defined((d: LineChartDataPoint) => {
                    return d.value !== null;
                });

            if (EnumExtensions.hasFlag(this.lineType, LineChartType.smooth)) {
                line.interpolate('basis');
                if (area) {
                    area.interpolate('basis');
                }
            }

            var extraLineShift = this.extraLineShift();

            this.mainGraphicsContext.attr('transform', SVGUtil.translate(LineChart.HorizontalShift + extraLineShift, 0));
            
            this.mainGraphicsContext.attr('height', this.getAvailableHeight())
                .attr('width', this.getAvailableWidth());
            this.toolTipContext.attr('transform', SVGUtil.translate(LineChart.HorizontalShift + extraLineShift, 0));

            if (EnumExtensions.hasFlag(this.lineType, LineChartType.area)) {
                var catAreaSelect = this.mainGraphicsContext.selectAll(LineChart.CategoryAreaClassSelector)
                    .data(data.series, (d: LineChartDataPoint) => d.identity.getKey());

                var catAreaEnter =
                    catAreaSelect
                        .enter().append('g')
                        .classed(LineChart.CategoryAreaClassName, true);

                catAreaEnter.append(LineChart.PathElementName);

                var catAreaUpdate = this.mainGraphicsContext.selectAll(LineChart.CategoryAreaClassSelector);

                catAreaUpdate.select(LineChart.PathElementName)
                    .transition()
                    .ease('linear')
                    .duration(duration)
                    .attr('d', (d: LineChartSeries) => area(d.data))
                    .style('fill', (d: LineChartSeries) => d.color)
                    .style('fill-opacity', (d: LineChartSeries) => (hasSelection && !d.selected) ? LineChart.DimmedAreaFillOpacity : LineChart.AreaFillOpacity);

                catAreaSelect.exit().remove();
            }

            var catSelect = this.mainGraphicsContext.selectAll(LineChart.CategoryClassSelector)
                .data(data.series, (d: LineChartDataPoint) => d.identity.getKey());

            var catEnter = catSelect
                .enter()
                .append('g')
                .classed(LineChart.CategoryClassName, true);

            catEnter.append(LineChart.PathElementName);
            catEnter.selectAll(LineChart.CategoryValuePoint.selector)
                .data((d: LineChartSeries) => d.data)
                .enter()
                .append(LineChart.CircleElementName)
                .classed(LineChart.CategoryValuePoint.class, true);

            // moving this up to avoid using the svg path generator with NaN values
            // do not move this without validating that no errors are thrown in the browser console
            catSelect.exit().remove();

            // add the drag handle, if needed
            if (this.isInteractiveChart && !this.dragHandle) {
                var handleTop = this.getAvailableHeight();
                this.dragHandle = this.toolTipContext.append('circle')
                    .attr('cx', 0)
                    .attr('cy', handleTop)
                    .attr('r', '6px')
                    .classed('drag-handle', true);
            }

            // Create the selection circles 
            var linesCount = catSelect.data().length; // number of lines plotted
            while (this.selectionCircles.length < linesCount) {
                var addedCircle = this.toolTipContext.append(LineChart.CircleElementName)
                    .classed(LineChart.CircleClassName, true)
                    .attr('r', LineChart.CircleRadius).style('opacity', 0);
                this.selectionCircles.push(addedCircle);
            }

            while (this.selectionCircles.length > linesCount) {
                this.selectionCircles.pop().remove();
            }

            var catUpdate = this.mainGraphicsContext.selectAll(LineChart.CategoryClassSelector);

            var lineSelection = catUpdate.select(LineChart.PathElementName)
                .classed('line', true)
                .style('stroke', (d: LineChartSeries) => d.color)
                .style('stroke-opacity', (d: LineChartSeries) => ColumnUtil.getFillOpacity(d.selected, false, hasSelection, false));
            lineSelection
                .transition()
                .ease('linear')
                .duration(duration)
                .attr('d', (d: LineChartSeries) => {
                    return line(d.data);
                });

            var that = this;
            var updateSelection = catUpdate.selectAll(LineChart.CategoryValuePoint.selector);
            var transitions = updateSelection
                .style('fill', function () {
                    var lineSeries = d3.select(this.parentNode).datum();
                    return lineSeries.color;
                })
                .style('fill-opacity', function () {
                    var lineSeries = d3.select(this.parentNode).datum();
                    return ColumnUtil.getFillOpacity(lineSeries.selected, false, hasSelection, false);
                })
                .transition()
                .duration(duration)
                .attr({
                    'cx': function (d: LineChartDataPoint, i: number) {
                        var lineSeries = d3.select(this.parentNode).datum();
                        var circleIndex = that.shouldDrawCircle(lineSeries, i);
                        return circleIndex ? xScale(that.getXValue(d)) : 0;
                    },
                    'cy': function (d: LineChartDataPoint, i: number) {
                        var lineSeries = d3.select(this.parentNode).datum();
                        var circleIndex = that.shouldDrawCircle(lineSeries, i);
                        return circleIndex ? yScale(d.value) : 0;
                    },
                    'r': function (d: LineChartDataPoint, i: number) {
                        var lineSeries = d3.select(this.parentNode).datum();
                        var circleIndex = that.shouldDrawCircle(lineSeries, i);
                        return circleIndex ? LineChart.CircleRadius : 0;
                    }
                });
            if (this.isInteractiveChart && this.hasDataPoint(data.series)) {
                var selectionSize = updateSelection.size();
                var endedTransitionCount = 0;
                transitions.each('end', () => {
                    // When transitions finish, and it's an interactive chart - select the first column (draw the legend and the handle)
                    endedTransitionCount++;
                    if (endedTransitionCount === selectionSize) { // all transitions had finished
                        this.selectColumn(0, true);
                    }
                });
            }

            if (data.dataLabelsSettings.show) {
                var layout = dataLabelUtils.getLineChartLabelLayout(xScale, yScale, data.dataLabelsSettings, data.isScalar, this.yAxisProperties.formatter);
                var dataPoints: LineChartDataPoint[] = [];

                for (var i = 0, ilen = data.series.length; i < ilen; i++) {
                    Array.prototype.push.apply(dataPoints, data.series[i].data);
                }

                dataLabelUtils.drawDefaultLabelsForDataPointChart(dataPoints, this.mainGraphicsSVG, layout, this.currentViewport);
                this.mainGraphicsSVG.select('.labels').attr('transform', SVGUtil.translate(LineChart.HorizontalShift + extraLineShift, 0));
            }
            else {
                dataLabelUtils.cleanDataLabels(this.mainGraphicsSVG);
            }

            TooltipManager.addTooltip(catSelect, (tooltipEvent: TooltipEvent) => {
                var pointX: number = tooltipEvent.elementCoordinates[0];
                return LineChart.getTooltipInfoByPointX(that, tooltipEvent.data, pointX);
            }, true);

            catSelect.exit().remove();

            if (this.interactivityService) {
                var dataPointsToBind: SelectableDataPoint[] = data.series.slice();
                for (var i = 0, ilen = data.series.length; i < ilen; i++) {
                    dataPointsToBind = dataPointsToBind.concat(data.series[i].data);
                }
                var options: LineChartBehaviorOptions = {
                    dataPoints: dataPointsToBind,
                    lines: lineSelection,
                    interactivityLines: lineSelection,
                    dots: this.mainGraphicsContext.selectAll(".cat .dot"),
                    areas: catAreaUpdate,
                    clearCatcher: this.clearCatcher,
                };
                this.interactivityService.apply(this, options);
            }
        }
        
        /**
         * Note: Static for tests.
         */
        public static getTooltipInfoByPointX(lineChart: LineChart, pointData: any, pointX: number): TooltipDataItem[] {

            var index: number = 0;

            if (lineChart.data.isScalar) {
                var currentX = powerbi.visuals.AxisHelper.invertScale(lineChart.xAxisProperties.scale, pointX);
                index = lineChart.findClosestXAxisIndex(currentX, pointData.data);
            }
            else {
                var scale: D3.Scale.OrdinalScale = <D3.Scale.OrdinalScale>lineChart.xAxisProperties.scale;
                index = AxisHelper.getOrdinalScaleClosestDataPointIndex(scale, pointX);
            }

            return pointData.data[index].tooltipInfo;
        }

        public getVisualCategoryAxisIsScalar(): boolean {
            return this.data ? this.data.isScalar : false;
        }

        public getSupportedCategoryAxisType(): string {
            var dvCategories = this.dataViewCat ? this.dataViewCat.categories : undefined;
            var categoryType = ValueType.fromDescriptor({ text: true });
            if (dvCategories && dvCategories.length > 0 && dvCategories[0].source && dvCategories[0].source.type)
                categoryType = dvCategories[0].source.type;

            var isOrdinal = AxisHelper.isOrdinal(categoryType);
            return isOrdinal ? axisType.categorical : axisType.both;
        }

        public getPreferredPlotArea(isScalar: boolean, categoryCount: number, categoryThickness: number): IViewport {
            return CartesianChart.getPreferredPlotArea(
                categoryCount,
                categoryThickness,
                this.currentViewport,
                this.isScrollable,
                isScalar);
        }

        private getCategoryCount(origCatgSize): number {
            var availableWidth = this.getAvailableWidth();
            var categoryThickness = CartesianChart.MinOrdinalRectThickness;
            return Math.min(Math.round((availableWidth - categoryThickness * CartesianChart.OuterPaddingRatio * 2) / categoryThickness), origCatgSize);
        }

        private getAvailableWidth(): number {
            return this.currentViewport.width - (this.margin.left + this.margin.right);
        }

        private getAvailableHeight(): number {
            return this.currentViewport.height - (this.margin.top + this.margin.bottom);
        }

        private static sliceSeries(series: LineChartSeries[], newLength: number, startIndex: number = 0): LineChartSeries[] {
            var newSeries: LineChartSeries[] = [];
            if (series && series.length > 0) {
                debug.assert(series[0].data.length >= newLength, "invalid newLength");
                for (var i = 0, len = series.length; i < len; i++) {
                    newSeries[i] = Prototype.inherit(series[i]);
                    newSeries[i].data = series[i].data.slice(startIndex, startIndex + newLength);
                }
            }
            return newSeries;
        }

        private extraLineShift(): number {
            if (!this.data.isScalar) {
                // This will place the line points in the middle of the bands
                // So they center with Labels when scale is ordinal.
                var xScale = <D3.Scale.OrdinalScale>this.xAxisProperties.scale;
                if (xScale.rangeBand)
                    return xScale.rangeBand() / 2;
            }
            return 0;
        }

        private hasDataPoint(series: LineChartSeries[]): boolean {
            if (series.length === 0)
                return false;
            for (var i = 0, len = series.length; i < len; i++) {
                if (series[i].data.length > 0)
                    return true;
            }
            return false;
        }

        private lookupXValue(index: number, type: ValueType): any {
            debug.assertValue(this.data, 'this.data');

            var isDateTime = AxisHelper.isDateTime(type);
            if (isDateTime && this.data.isScalar)
                return new Date(index);

            if (this.data && this.data.series && this.data.series.length > 0) {
                var firstSeries = this.data.series[0];
                if (firstSeries) {
                    var data = firstSeries.data;
                    if (data) {
                        var dataAtIndex = data[index];
                        if (dataAtIndex) {
                            if (isDateTime)
                                return new Date(dataAtIndex.categoryValue);
                            return dataAtIndex.categoryValue;
                        }
                    }
                }
            }

            return index;
        }

        private getXValue(d: LineChartDataPoint): any {
            return this.data.isScalar ? d.categoryValue : d.categoryIndex;
        }
        
        /**
         * This checks to see if a data point is isolated, which means
         * the previous and next data point are both null.
         */
        private shouldDrawCircle(d: LineChartSeries, i: number): boolean {
            var dataLength = d.data.length;
            var isLastPoint = i === (dataLength - 1);
            var isFirstPoint = i === 0;

            if (i > dataLength - 1 || d.data[i] === null || d.data[i].value === null)
                return false;

            if (isFirstPoint && isLastPoint)
                return true;
            if (isFirstPoint && dataLength > 1 && d.data[i + 1].value === null)
                return true;
            if (!isFirstPoint && isLastPoint && d.data[i - 1].value === null)
                return true;
            if (!isFirstPoint && !isLastPoint && d.data[i - 1].value === null && d.data[i + 1].value === null)
                return true;
            return false;
        }
        
        /**
         * Updates the hover line and the legend with the selected colums (given by columnIndex).
         */
        public selectColumn(columnIndex: number, force: boolean = false) {
            if (!force && this.lastInteractiveSelectedColumnIndex === columnIndex) return; // same column, nothing to do here

            this.lastInteractiveSelectedColumnIndex = columnIndex;
            var x = this.getChartX(columnIndex);
            this.setHoverLine(x);
            var legendItems = this.createLegendDataPoints(columnIndex);
            this.options.cartesianHost.updateLegend(legendItems);
        }

        private setHoverLine(chartX: number) {
            this.hoverLine
                .attr('x1', chartX)
                .attr('x2', chartX)
                .attr("y1", 0).attr("y2", this.getAvailableHeight())
                .style('opacity', 1);

            var that = this;
            this.mainGraphicsContext
                .selectAll(LineChart.CategoryClassSelector)
                .selectAll(LineChart.PathElementName)
                .each(function (series: LineChartSeries) {
                    // Get the item color for the handle dots
                    var color = series.color;
                    var circleToChange = that.selectionCircles[series.lineIndex];

                    circleToChange
                        .attr({
                            'cx': chartX,
                            'cy': () => {
                                var pathElement = d3.select(this).node<D3.D3Element>();
                                var pos = that.getPosition(chartX, pathElement);
                                return pos.y;
                            }
                        })
                        .style({
                            'opacity': 1,
                            'fill': color
                        });

                    if (that.dragHandle) that.dragHandle.attr('cx', chartX);
                });
        }

        private getChartX(columnIndex: number) {
            var x: number;
            if (this.data.isScalar) {
                x = Math.max(0, this.xAxisProperties.scale(this.data.series[0].data[columnIndex].categoryValue));
            } else {
                x = Math.max(0, this.xAxisProperties.scale(columnIndex));
            }

            var rangeEnd = powerbi.visuals.AxisHelper.extent(this.xAxisProperties.scale)[1];

            x = Math.min(x, rangeEnd);
            if (isNaN(x)) {
                return;
            }
            return x;
        }
        
        /**
         * Finds the index of the category of the given x coordinate given.
         */
        private findIndex(x: number): number {
            x -= (this.margin.left + powerbi.visuals.LineChart.HorizontalShift);

            // Get the x value of the selected position, according to the axis.
            var currentX = powerbi.visuals.AxisHelper.invertScale(this.xAxisProperties.scale, x);

            var index = currentX;
            if (this.data.isScalar) { // currentX is not the index
                index = this.findClosestXAxisIndex(currentX, this.data.series[0].data);
            }

            return index;
        }

        private findClosestXAxisIndex(currentX: number, xAxisValues: LineChartDataPoint[]): number {
            var closestValueIndex: number = -1;
            var minDistance = Number.MAX_VALUE;
            for (var i in xAxisValues) {
                var distance = Math.abs(currentX - (<LineChartDataPoint> xAxisValues[i]).categoryValue);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestValueIndex = i;
                }
            }
            return closestValueIndex;
        }

        private getPosition(x: number, pathElement: D3.D3Element): SVGPoint {
            var pathLength = pathElement.getTotalLength();
            var pos: SVGPoint;
            var beginning = 0, end = pathLength, target;

            while (true) {
                target = Math.floor((beginning + end) / 2);
                pos = pathElement.getPointAtLength(target);
                SVGUtil.ensureValidSVGPoint(pos);
                if ((target === end || target === beginning) && pos.x !== x)
                    break;
                if (pos.x > x) end = target;
                else if (pos.x < x) beginning = target;
                else
                    break;
            }
            return pos;
        }

        private createLegendDataPoints(columnIndex: number): LegendData {
            var data = this.data;
            if (!data)
                return null;

            var legendDataPoints: LegendDataPoint[] = [];
            var category: any;

            // Category will be the same for all series. This is an optimization.
            if (data.series.length > 0) {
                var lineDatePointFirstSeries: LineChartDataPoint = data.series[0].data[columnIndex];
                var isDateTime = AxisHelper.isDateTime(this.xAxisProperties.axisType);
                var value = (isDateTime && this.data.isScalar && lineDatePointFirstSeries) ? lineDatePointFirstSeries.categoryValue : columnIndex;
                category = lineDatePointFirstSeries && this.lookupXValue(value, this.xAxisProperties.axisType);
            }

            var formatStringProp = lineChartProps.general.formatString;
            var seriesYCol: DataViewMetadataColumn = null;
            // iterating over the line data (i is for a line)
            for (var i = 0, len = data.series.length; i < len; i++) {
                var series = data.series[i];
                var lineData = series.data;
                var lineDataPoint = lineData[columnIndex];
                var measure = lineDataPoint && lineDataPoint.value;

                var label = converterHelper.getFormattedLegendLabel(series.yCol, this.dataViewCat.values, formatStringProp);
                seriesYCol = series.yCol;
                legendDataPoints.push({
                    color: series.color,
                    icon: LegendIcon.Line,
                    label: label,
                    category: valueFormatter.format(category, valueFormatter.getFormatString(series.xCol, formatStringProp)),
                    measure: valueFormatter.format(measure, valueFormatter.getFormatString(series.yCol, formatStringProp)),
                    identity: series.identity,
                    selected: false
                });
            }

            var dvValues = this.dataViewCat ? this.dataViewCat.values : null;
            var title = dvValues && dvValues.source ? dvValues.source.displayName : "";

            return {
                title: title,
                dataPoints: legendDataPoints
            };
        }

        public accept(visitor: InteractivityVisitor, options: any) {
            visitor.visitLineChart(options);
        }
    }
}