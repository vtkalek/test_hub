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
    export interface DonutConstructorOptions {
        sliceWidthRatio?: number;
        animator?: IDonutChartAnimator;
        isScrollable?: boolean;
        disableGeometricCulling?: boolean;
    }
    
    /**
     * Used because data points used in D3 pie layouts are placed within a container with pie information.
     */
    export interface DonutArcDescriptor extends D3.Layout.ArcDescriptor {
        data: DonutDataPoint;
    }

    export interface DonutDataPoint extends SelectableDataPoint, TooltipEnabledDataPoint, LabelEnabledDataPoint {
        measure: number;
        measureFormat?: string;
        percentage: number;
        highlightRatio: number;
        label: string;
        index: number;
        /** Data points that may be drilled into */
        internalDataPoints?: DonutDataPoint[];
        color: string;
        labelColor: string;
    }

    export interface DonutData {
        dataPointsToDeprecate: DonutDataPoint[];
        dataPoints: DonutArcDescriptor[]; // The data points will be culled based on viewport size to remove invisible slices
        unCulledDataPoints: DonutDataPoint[]; // The unculled data points will never be culled
        dataPointsToEnumerate?: LegendDataPoint[];
        legendData: LegendData;
        hasHighlights: boolean;
        dataLabelsSettings: VisualDataLabelsSettings;
        legendObjectProperties?: DataViewObject;
        maxValue?: number;
        visibleGeometryCulled?: boolean;
    }

    interface DonutChartSettings {
        /**
         * The duration for a long animation displayed after a user interaction with an interactive chart. 
         */
        chartRotationAnimationDuration?: number;
        /**
         * The duration for a short animation displayed after a user interaction with an interactive chart.
         */
        legendTransitionAnimationDuration?: number;
    }

    interface InteractivityState {
        interactiveLegend: DonutChartInteractiveLegend;
        valueToAngleFactor: number; // Ratio between 360 and the sum of the angles
        sliceAngles: number[]; // Saves the angle to rotate of each slice
        currentRotate: number; // Keeps how much the donut is rotated by
        interactiveChosenSliceFinishedSetting: boolean; // flag indicating whether the chosen interactive slice was set
        lastChosenInteractiveSliceIndex: number; // keeps the index of the selected slice
        donutCenter: { // center of the chart
            x: number; y: number;
        };
        totalDragAngleDifference: number; // keeps how much of a rotation happened in the drag
        previousDragAngle: number; // previous angle of the drag event
        currentIndexDrag: number; // index of the slice that is currently showing in the legend 
        previousIndexDrag: number; // index of the slice that was showing in the legend before current drag event
    }

    export interface DonutLayout {
        fontSize: string;
        shapeLayout: {
            d: (d: DonutArcDescriptor) => string;
        };
        highlightShapeLayout: {
            d: (d: DonutArcDescriptor) => string;
        };
        zeroShapeLayout: {
            d: (d: DonutArcDescriptor) => string;
        };
    }
    
    /**
     * Renders a donut chart.
     */
    export class DonutChart implements IVisual, IInteractiveVisual {
        private static ClassName = 'donutChart';
        private static InteractiveLegendClassName = 'donutLegend';
        private static InteractiveLegendArrowClassName = 'donutLegendArrow';
        private static DrillDownAnimationDuration = 1000;
        private static OuterArcRadiusRatio = 0.9;
        private static InnerArcRadiusRatio = 0.8;
        private static FontsizeThreshold = 150;
        private static SmallFontSize = '8px';
        private static NormalFontSize = '11px';
        private static InteractiveLegendContainerHeight = 70;
        private static OpaqueOpacity = 1.0;
        private static SemiTransparentOpacity = 0.6;
        private static defaultSliceWidthRatio: number = 0.48;
        private static invisibleArcLengthInPixels: number = 3;
        private static sliceClass: ClassAndSelector = {
            class: 'slice',
            selector: '.slice',
        };
        private static sliceHighlightClass: ClassAndSelector = {
            class: 'slice-highlight',
            selector: '.slice-highlight',
        };
        private static twoPi = 2 * Math.PI;
        public static EffectiveZeroValue = 0.000000001; // Very small multiplier so that we have a properly shaped zero arc to animate to/from.
        public static PolylineOpacity = 0.5;
        private sliceWidthRatio: number;
        private svg: D3.Selection;
        private mainGraphicsContext: D3.Selection;
        private clearCatcher: D3.Selection;
        private legendContainer: D3.Selection;
        private interactiveLegendArrow: D3.Selection;
        private parentViewport: IViewport;
        private currentViewport: IViewport;
        private formatter: ICustomValueFormatter;
        private data: DonutData;
        private pie: D3.Layout.PieLayout;
        private arc: D3.Svg.Arc;
        private outerArc: D3.Svg.Arc;
        private radius: number;
        private previousRadius: number;
        private key: any;
        private colors: IDataColorPalette;
        private style: IVisualStyle;
        private drilled: boolean;
        private allowDrilldown: boolean;
        private options: VisualInitOptions;
        private isInteractive: boolean;
        private interactivityState: InteractivityState;
        private chartRotationAnimationDuration: number;
        private interactivityService: IInteractivityService;
        private legend: ILegend;
        private hasSetData: boolean;
        private isScrollable: boolean;
        private disableGeometricCulling: boolean;
        private hostService: IVisualHostServices;
        private settings: DonutChartSettings;
        
        /**
         * Note: Public for testing.
         */
        public animator: IDonutChartAnimator;

        constructor(options?: DonutConstructorOptions) {
            if (options) {
                this.sliceWidthRatio = options.sliceWidthRatio;
                this.animator = options.animator;
                this.isScrollable = options.isScrollable ? options.isScrollable : false;
                this.disableGeometricCulling = options.disableGeometricCulling ? options.disableGeometricCulling : false;
            }
            if (this.sliceWidthRatio == null) {
                this.sliceWidthRatio = DonutChart.defaultSliceWidthRatio;
            }
        }

        public static converter(dataView: DataView, colors: IDataColorPalette, viewport?: IViewport, disableGeometricCulling?: boolean): DonutData {
            var converter = new DonutChartConversion.DonutChartConverter(dataView, colors);
            converter.convert();
            var d3PieLayout = d3.layout.pie()
                .sort(null)
                .value((d: DonutDataPoint) => {
                    return d.percentage;
                });
            var culledDataPoints = (disableGeometricCulling === false && viewport) ? DonutChart.cullDataByViewport(converter.dataPoints, converter.maxValue, viewport) : converter.dataPoints;
            var data: DonutData = {
                dataPointsToDeprecate: culledDataPoints,
                dataPoints: d3PieLayout(culledDataPoints),
                unCulledDataPoints: converter.dataPoints,
                dataPointsToEnumerate: converter.legendData.dataPoints,
                legendData: converter.legendData,
                hasHighlights: converter.hasHighlights,
                dataLabelsSettings: converter.dataLabelsSettings,
                legendObjectProperties: converter.legendObjectProperties,
                maxValue: converter.maxValue,
                visibleGeometryCulled: converter.dataPoints.length !== culledDataPoints.length,
            };

            return data;
        }

        public init(options: VisualInitOptions) {
            this.options = options;
            var element = options.element;
            // Ensure viewport is empty on init
            element.empty();
            this.parentViewport = options.viewport;
            // avoid deep copy
            this.currentViewport = {
                height: options.viewport.height,
                width: options.viewport.width,
            };

            this.formatter = valueFormatter.format;
            this.data = {
                dataPointsToDeprecate: [],
                dataPointsToEnumerate: [],
                dataPoints: [],
                unCulledDataPoints: [],
                legendData: { title: "", dataPoints: [] },
                hasHighlights: false,
                dataLabelsSettings: dataLabelUtils.getDefaultDonutLabelSettings(),
            };
            this.drilled = false;
            // Leaving this false for now, will depend on the datacategory in the future
            this.allowDrilldown = false;
            this.style = options.style;
            this.colors = this.style.colorPalette.dataColors;
            this.radius = 0;
            this.isInteractive = options.interactivity && options.interactivity.isInteractiveLegend;
            var donutChartSettings = this.settings;

            this.interactivityService = VisualInteractivityFactory.buildInteractivityService(options);
            this.legend = createLegend(element, options.interactivity && options.interactivity.isInteractiveLegend, this.interactivityService, this.isScrollable);

            this.hostService = options.host;

            if (this.isInteractive) {
                this.chartRotationAnimationDuration = (donutChartSettings && donutChartSettings.chartRotationAnimationDuration) ? donutChartSettings.chartRotationAnimationDuration : 0;

                // Create interactive legend
                var legendContainer = this.legendContainer = d3.select(element.get(0))
                    .append('div')
                    .classed(DonutChart.InteractiveLegendClassName, true);
                this.interactivityState = {
                    interactiveLegend: new DonutChartInteractiveLegend(this, legendContainer, this.colors, options, this.settings),
                    valueToAngleFactor: 0,
                    sliceAngles: [],
                    currentRotate: 0,
                    interactiveChosenSliceFinishedSetting: false,
                    lastChosenInteractiveSliceIndex: 0,
                    totalDragAngleDifference: 0,
                    currentIndexDrag: 0,
                    previousIndexDrag: 0,
                    previousDragAngle: 0,
                    donutCenter: { x: 0, y: 0 },
                };
            }

            this.svg = d3.select(element.get(0))
                .append('svg')
                .style('position', 'absolute')
                .classed(DonutChart.ClassName, true);

            this.clearCatcher = appendClearCatcher(this.svg);

            this.mainGraphicsContext = this.svg.append('g');
            this.mainGraphicsContext.append("g")
                .classed('slices', true);
            this.mainGraphicsContext.append("g")
                .classed('lines', true);

            this.pie = d3.layout.pie()
                .sort(null)
                .value((d: DonutDataPoint) => {
                    return d.percentage;
                });
        }

        public onDataChanged(options: VisualDataChangedOptions): void {
            debug.assertValue(options, 'options');

            var dataViews = options.dataViews;
            if (dataViews && dataViews.length > 0 && dataViews[0].categorical) {
                this.data = DonutChart.converter(dataViews[0], this.colors, this.currentViewport, this.disableGeometricCulling);
                if (!(this.options.interactivity && this.options.interactivity.isInteractiveLegend))
                    this.renderLegend();

                if (this.interactivityService)
                    this.interactivityService.applySelectionStateToData(this.data.dataPoints.map((d) => d.data));
            }

            else {
                this.data = {
                    dataPointsToDeprecate: [],
                    dataPointsToEnumerate: [],
                    dataPoints: [],
                    unCulledDataPoints: [],
                    legendData: { title: "", dataPoints: [] },
                    hasHighlights: false,
                    dataLabelsSettings: dataLabelUtils.getDefaultDonutLabelSettings(),
                };
            }

            this.initViewportDependantProperties();

            this.updateInternal(this.data, options.suppressAnimations);

            this.hasSetData = true;

            if (dataViews) {
                var warnings = getInvalidValueWarnings(
                    dataViews,
                    false /*supportsNaN*/,
                    false /*supportsNegativeInfinity*/,
                    false /*supportsPositiveInfinity*/);

                if (this.data.visibleGeometryCulled) {
                    var cullWarning = new GeometryCulledWarning();
                    if (!warnings)
                        warnings = [cullWarning];
                    else
                        warnings.unshift(cullWarning);
                }

                if (warnings && warnings.length > 0)
                    this.hostService.setWarnings(warnings);
            }
        }

        public onResizing(viewport: IViewport): void {
            var duration = 0;

            this.parentViewport = viewport;
            if (this.currentViewport && (this.currentViewport.height === viewport.height && this.currentViewport.width === viewport.width))
                return;
            this.parentViewport = viewport;
            if (this.hasSetData)
                this.renderLegend();
            this.initViewportDependantProperties(duration);
            var d3PieLayout = d3.layout.pie()
                .sort(null)
                .value((d: DonutDataPoint) => {
                    return d.percentage;
                });
            this.data.dataPoints = d3PieLayout(DonutChart.cullDataByViewport(this.data.unCulledDataPoints, this.data.maxValue, viewport));
            if (this.data.dataPoints.length !== this.data.unCulledDataPoints.length)
                this.data.visibleGeometryCulled = true;
            else
                this.data.visibleGeometryCulled = false;
            this.updateInternal(this.data, true /* suppressAnimations */, duration);
            this.previousRadius = this.radius;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            switch (options.objectName) {
                case 'legend':
                    return this.enumerateLegend();
                case 'dataPoint':
                    return this.enumerateDataPoints();
                case 'labels':
                    if (this.data)
                        return dataLabelUtils.enumerateDataLabels(this.data.dataLabelsSettings, /*withPosition:*/ false, /*withPrecision:*/ true, /*withDisplayUnit:*/ true);
                    else return dataLabelUtils.enumerateDataLabels(dataLabelUtils.getDefaultDonutLabelSettings(), /*withPosition:*/ false, /*withPrecision:*/ true, /*withDisplayUnit:*/ true);
                case 'categoryLabels':
                    return (this.data)
                        ? dataLabelUtils.enumerateCategoryLabels(this.data.dataLabelsSettings, false, true)
                        : dataLabelUtils.enumerateCategoryLabels(null, false, true);
            }
        }

        private enumerateDataPoints(): VisualObjectInstance[] {
            var data = this.data;
            if (!data)
                return;
            var instances: VisualObjectInstance[] = [];

            var dataPoints = data.dataPointsToEnumerate;
            var dataPointsLength = dataPoints.length;

            for (var i = 0; i < dataPointsLength; i++) {
                var dataPoint = dataPoints[i];
                instances.push({
                    objectName: 'dataPoint',
                    displayName: dataPoint.label,
                    selector: ColorHelper.normalizeSelector(dataPoint.identity.getSelector()),
                    properties: {
                        fill: { solid: { color: dataPoint.color } }
                    },
                });
            }
            return instances;
        }

        private enumerateLegend(): VisualObjectInstance[] {
            var data = this.data;
            if (!data)
                return;

            var legendObjectProperties: DataViewObjects = { legend: data.legendObjectProperties };

            var show = DataViewObjects.getValue(legendObjectProperties, donutChartProps.legend.show, this.legend.isVisible());
            var showTitle = DataViewObjects.getValue(legendObjectProperties, donutChartProps.legend.showTitle, true);
            var titleText = DataViewObjects.getValue(legendObjectProperties, donutChartProps.legend.titleText, this.data.legendData.title);

            return [{
                selector: null,
                objectName: 'legend',
                properties: {
                    show: show,
                    position: LegendPosition[this.legend.getOrientation()],
                    showTitle: showTitle,
                    titleText: titleText
                }
            }];
        }

        public setInteractiveChosenSlice(sliceIndex: number): void {
            if (this.interactivityState.sliceAngles.length === 0) return;

            this.interactivityState.lastChosenInteractiveSliceIndex = sliceIndex;
            this.interactivityState.interactiveChosenSliceFinishedSetting = false;
            var viewport = this.currentViewport;
            var moduledIndex = sliceIndex % this.data.dataPoints.length;
            var angle = this.interactivityState.sliceAngles[moduledIndex];

            this.svg.select('g')
                .transition()
                .duration(this.chartRotationAnimationDuration)
                .ease('elastic')
                .attr('transform', SVGUtil.translateAndRotate(viewport.width / 2, viewport.height / 2, 0, 0, angle))
                .each('end', () => { this.interactivityState.interactiveChosenSliceFinishedSetting = true; });

            this.interactivityState.currentRotate = angle;
            this.interactivityState.interactiveLegend.updateLegend(moduledIndex);
            // Set the opacity of chosen slice to full and the others to semi-transparent
            this.svg.selectAll('.slice').attr('opacity', (d, index) => {
                return index === moduledIndex ? 1 : 0.6;
            });

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);
        }

        private calculateRadius(): number {
            var viewport = this.currentViewport;
            if (!this.isInteractive && this.data && (this.data.dataLabelsSettings.show || this.data.dataLabelsSettings.showCategory)) {
                // if we have category or data labels, use a sigmoid to blend the desired denominator from 2 to 3.
                // if we are taller than we are wide, we need to use a larger denominator to leave horizontal room for the labels.
                var hw = viewport.height / viewport.width;
                var denom = 2 + (1 / (1 + Math.exp(-5 * (hw - 1))));
                return Math.min(viewport.height, viewport.width) / denom;
            }

            // no labels (isInteractive does not have labels since the interactive legend shows extra info)
            return Math.min(viewport.height, viewport.width) / 2;
        }

        private initViewportDependantProperties(duration: number = 0) {
            this.currentViewport.height = this.parentViewport.height;
            this.currentViewport.width = this.parentViewport.width;
            var viewport = this.currentViewport;

            if (this.isInteractive) {
                viewport.height -= DonutChart.InteractiveLegendContainerHeight; // leave space for the legend
            }
            else {
                var legendMargins = this.legend.getMargins();
                viewport.height -= legendMargins.height;
                viewport.width -= legendMargins.width;
            }

            this.svg.attr({
                'width': viewport.width,
                'height': viewport.height
            });

            if (this.isInteractive) {
                this.legendContainer
                    .style({
                        'width': '100%',
                        'height': DonutChart.InteractiveLegendContainerHeight + 'px',
                        'overflow': 'hidden',
                        'top': 0
                    });
                this.svg
                    .style('top', DonutChart.InteractiveLegendContainerHeight);
            }

            this.previousRadius = this.radius;
            var radius = this.radius = this.calculateRadius();

            this.arc = d3.svg.arc();

            this.outerArc = d3.svg.arc()
                .innerRadius(radius * DonutChart.OuterArcRadiusRatio)
                .outerRadius(radius * DonutChart.OuterArcRadiusRatio);

            if (this.isInteractive) {
                this.mainGraphicsContext.attr('transform', SVGUtil.translate(viewport.width / 2, viewport.height / 2));
            } else {
                this.mainGraphicsContext.transition().duration(duration).attr('transform', SVGUtil.translate(viewport.width / 2, viewport.height / 2));
            }

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);
        }

        private mergeDatasets(first: any[], second: any[]): any[] {
            var secondSet = d3.set();
            second.forEach((d) => {
                secondSet.add(d.identity ? d.identity.getKey() : d.data.identity.getKey());
            });

            var onlyFirst = first.filter((d) => {
                return !secondSet.has(d.identity ? d.identity.getKey() : d.data.identity.getKey());
            }).map((d) => {
                var derived = Prototype.inherit(d);
                derived.percentage === undefined ? derived.data.percentage = 0 : derived.percentage = 0;
                return derived;
            });

            return d3.merge([second, onlyFirst]);
        }

        private updateInternal(data: DonutData, suppressAnimations: boolean, duration: number = 0) {
            var viewport = this.currentViewport;
            duration = duration || AnimatorCommon.GetAnimationDuration(this.animator, suppressAnimations);

            if (this.animator) {
                var layout = DonutChart.getLayout(this.radius, this.sliceWidthRatio, viewport);
                var result: DonutChartAnimationResult;
                var shapes: D3.UpdateSelection;
                var highlightShapes: D3.UpdateSelection;
                if (!suppressAnimations) {
                    var animationOptions: DonutChartAnimationOptions = {
                        viewModel: data,
                        colors: this.colors,
                        graphicsContext: this.mainGraphicsContext,
                        interactivityService: this.interactivityService,
                        layout: layout,
                        radius: this.radius,
                        sliceWidthRatio: this.sliceWidthRatio,
                        viewport: viewport,
                    };
                    result = this.animator.animate(animationOptions);
                    shapes = result.shapes;
                    highlightShapes = result.highlightShapes;
                }
                if (suppressAnimations || result.failed) {
                    shapes = DonutChart.drawDefaultShapes(this.svg, data, layout, this.colors, this.radius);
                    highlightShapes = DonutChart.drawDefaultHighlightShapes(this.svg, data, layout, this.colors, this.radius);
                    DonutChart.drawDefaultCategoryLabels(this.mainGraphicsContext, data, layout, this.sliceWidthRatio, this.radius, this.currentViewport);
                }

                this.assignInteractions(shapes, highlightShapes, data);

                TooltipManager.addTooltip(shapes, (tooltipEvent: TooltipEvent) => tooltipEvent.data.data.tooltipInfo);
                TooltipManager.addTooltip(highlightShapes, (tooltipEvent: TooltipEvent) => tooltipEvent.data.data.tooltipInfo);
            }
            else {
                this.updateInternalToMove(data, duration);
            }

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);
        }

        private renderLegend(): void {
            if (!this.isInteractive) {
                var legendObjectProperties = this.data.legendObjectProperties;
                if (legendObjectProperties) {
                    var legendData = this.data.legendData;
                    LegendData.update(legendData, legendObjectProperties);
                    var position = <string>legendObjectProperties[legendProps.position];
                    if (position)
                        this.legend.changeOrientation(LegendPosition[position]);

                    this.legend.drawLegend(legendData, this.parentViewport);
                } else {
                    this.legend.changeOrientation(LegendPosition.Top);
                    this.legend.drawLegend({ dataPoints: [] }, this.parentViewport);
                }
            }
        }

        private addInteractiveLegendArrow(): void {
            var arrowHeightOffset = 11;
            var arrowWidthOffset = 33 / 2;
            if (!this.interactiveLegendArrow) {
                var interactiveLegendArrow = this.svg.append('g');
                interactiveLegendArrow.append('path')
                    .classed(DonutChart.InteractiveLegendArrowClassName, true)
                    .attr('d', 'M1.5,2.6C0.65,1.15,1.85,0,3,0l27,0c1.65,0,2.35,1.15,1.5,2.6L18,26.45c-0.8,1.45-2.15,1.45-2.95,0L1.95,2.6z');
                this.interactiveLegendArrow = interactiveLegendArrow;
            }
            var viewport = this.currentViewport;
            // Calculate the offsets from the legend container to the arrow.
            var distanceBetweenLegendAndArrow = (viewport.height - 2 * this.radius) / 2 + arrowHeightOffset;
            var middleOfChart = viewport.width / 2 - arrowWidthOffset;

            this.interactiveLegendArrow.attr('transform', SVGUtil.translate(middleOfChart, distanceBetweenLegendAndArrow));
        }

        private calculateSliceAngles(): void {
            var angles: number[] = [];
            var data = this.data.dataPoints;

            if (data.length === 0) {
                this.interactivityState.valueToAngleFactor = 0;
                this.interactivityState.sliceAngles = [];
                return;
            }

            var sum = 0;
            for (var i = 0, ilen = data.length; i < ilen; i++) {
                sum += data[i].data.percentage; // value is an absolute number
            }
            debug.assert(sum !== 0, 'sum of slices values cannot be zero');
            this.interactivityState.valueToAngleFactor = 360 / sum; // Calculate the ratio between 360 and the sum to know the angles to rotate by

            var currentAngle = 0;
            for (var i = 0, ilen = data.length; i < ilen; i++) {
                var relativeAngle = data[i].data.percentage * this.interactivityState.valueToAngleFactor;
                currentAngle += relativeAngle;
                angles.push((relativeAngle / 2) - currentAngle);
            }

            this.interactivityState.sliceAngles = angles;
        }

        private assignInteractions(slices: D3.Selection, highlightSlices: D3.Selection, data: DonutData): void {
            // assign interactions according to chart interactivity type
            if (this.isInteractive) {
                this.assignInteractiveChartInteractions(slices);
            }
            else if (this.interactivityService) {
                var behaviorOptions: DonutBehaviorOptions = {
                    clearCatcher: this.clearCatcher,
                    datapoints: data.dataPoints.map((value: DonutArcDescriptor) => value.data),
                    slices: slices,
                    highlightSlices: highlightSlices,
                    allowDrilldown: this.allowDrilldown,
                    visual: this,
                    hasHighlights: data.hasHighlights,
                    svg: this.svg,
                };

                this.interactivityService.apply(this, behaviorOptions);
            }
        }

        public setDrilldown(selection?: DonutDataPoint): void {
            if (selection) {
                var d3PieLayout = d3.layout.pie()
                    .sort(null)
                    .value((d: DonutDataPoint) => {
                        return d.percentage;
                    });
                // Drill into the current selection.
                var legendDataPoints: LegendDataPoint[] = [{ label: selection.label, color: selection.color, icon: LegendIcon.Box, identity: selection.identity, selected: selection.selected }];
                var legendData: LegendData = { title: "", dataPoints: legendDataPoints };
                var drilledDataPoints = d3PieLayout(selection.internalDataPoints);
                this.updateInternal({
                    dataPointsToDeprecate: selection.internalDataPoints,
                    dataPoints: drilledDataPoints,
                    unCulledDataPoints: drilledDataPoints.map((value) => value.data),
                    legendData: legendData,
                    hasHighlights: false,
                    dataLabelsSettings: this.data.dataLabelsSettings
                }, false /* suppressAnimations */, DonutChart.DrillDownAnimationDuration);
            } else {
                // Pop out of drill down to view the "outer" data.
                this.updateInternal(this.data, false /* suppressAnimations */, DonutChart.DrillDownAnimationDuration);
            }
        }

        private assignInteractiveChartInteractions(slice: D3.Selection) {
            var svg = this.svg;

            this.interactivityState.interactiveChosenSliceFinishedSetting = true;
            var svgRect = svg.node().getBoundingClientRect();
            this.interactivityState.donutCenter = { x: svgRect.left + svgRect.width / 2, y: svgRect.top + svgRect.height / 2 }; // Center of the donut chart
            this.interactivityState.totalDragAngleDifference = 0;
            this.interactivityState.currentRotate = 0;

            this.calculateSliceAngles();

            // Set the on click method for the slices so thsete pie chart will turn according to each slice's corresponding angle [the angle its on top]
            slice.on('click', (d: DonutArcDescriptor, clickedIndex: number) => {
                if (d3.event.defaultPrevented) return; // click was suppressed, for example from drag event
                this.setInteractiveChosenSlice(clickedIndex);
            });

            // Set the drag events
            var drag = d3.behavior.drag()
                .origin(Object)
                .on('dragstart', () => this.interactiveDragStart())
                .on('drag', () => this.interactiveDragMove())
                .on('dragend', () => this.interactiveDragEnd());
            svg.call(drag);
        }

        /**
         * Get the angle (in degrees) of the drag event coordinates.
         * The angle is calculated against the plane of the center of the donut
         * (meaning, when the center of the donut is at (0,0) coordinates).
         */
        private getAngleFromDragEvent(): number {
            var interactivityState = this.interactivityState;

            // get pageX and pageY (coordinates of the drag event) according to event type
            var pageX, pageY;
            var sourceEvent = <any>d3.event.sourceEvent;
            // check if that's a touch event or not
            if (sourceEvent.type.toLowerCase().indexOf('touch') !== -1) {
                if (sourceEvent.touches.length !== 1) return null; // in case there isn't a single touch - return null and do nothing.
                // take the first, single, touch surface.
                var touch = sourceEvent.touches[0];
                pageX = touch.pageX;
                pageY = touch.pageY;
            } else {
                pageX = sourceEvent.pageX;
                pageY = sourceEvent.pageY;
            }

            // Adjust the coordinates, putting the donut center as the (0,0) coordinates
            var adjustedCoordinates = { x: pageX - interactivityState.donutCenter.x, y: -pageY + interactivityState.donutCenter.y };
            // Move to polar axis - take only the angle (theta), and convert to degrees
            var angleToThePlane = Math.atan2(adjustedCoordinates.y, adjustedCoordinates.x) * 180 / Math.PI;
            return angleToThePlane;
        }

        private interactiveDragStart(): void {
            this.interactivityState.totalDragAngleDifference = 0;
            this.interactivityState.previousDragAngle = this.getAngleFromDragEvent();
        }

        private interactiveDragMove(): void {
            var data = this.data.dataPoints;
            var viewport = this.currentViewport;

            var interactivityState = this.interactivityState;

            if (interactivityState.interactiveChosenSliceFinishedSetting === true) {
                // get current angle from the drag event
                var currentDragAngle = this.getAngleFromDragEvent();
                if (!currentDragAngle) return; // if no angle was returned, do nothing
                // compare it to the previous drag event angle
                var angleDragDiff = interactivityState.previousDragAngle - currentDragAngle;

                interactivityState.totalDragAngleDifference += angleDragDiff;
                interactivityState.previousDragAngle = currentDragAngle;

                // Rotate the chart by the difference in angles
                interactivityState.currentRotate += angleDragDiff;

                // Rotate the chart to the current rotate angle
                this.svg.select('g')
                    .attr('transform', SVGUtil.translateAndRotate(viewport.width / 2, viewport.height / 2, 0, 0, this.interactivityState.currentRotate));

                var currentHigherLimit = data[0].data.percentage * interactivityState.valueToAngleFactor;
                var currentAngle = interactivityState.currentRotate <= 0 ? (interactivityState.currentRotate * -1) % 360 : (360 - (interactivityState.currentRotate % 360));

                interactivityState.currentIndexDrag = 0;
                //consider making this  ++interactivityState.currentIndexDrag ? then you don't need the if statement, the interactivityState.currentIndexDrag +1 and interactivityState.currentIndexDrag++
                // Check the current index according to the angle 
                var dataLength = data.length;
                while ((interactivityState.currentIndexDrag < dataLength) && (currentAngle > currentHigherLimit)) {
                    if (interactivityState.currentIndexDrag < (dataLength - 1)) {
                        currentHigherLimit += (data[interactivityState.currentIndexDrag + 1].data.percentage * interactivityState.valueToAngleFactor);
                    }
                    interactivityState.currentIndexDrag++;
                }

                // If the index changed update the legend and opacity
                if (interactivityState.currentIndexDrag !== interactivityState.previousIndexDrag) {
                    interactivityState.interactiveLegend.updateLegend(interactivityState.currentIndexDrag);
                    // set the opacticity of the top slice to full and the others to semi-transparent
                    this.svg.selectAll('.slice').attr('opacity', (d, index) => {
                        return index === interactivityState.currentIndexDrag ? DonutChart.OpaqueOpacity : DonutChart.SemiTransparentOpacity;
                    });
                    interactivityState.previousIndexDrag = interactivityState.currentIndexDrag;
                }
            }
        }

        private interactiveDragEnd(): void {
            // If totalDragDifference was changed, means we have a drag event (compared to a click event)
            if (this.interactivityState.totalDragAngleDifference !== 0) {
                this.setInteractiveChosenSlice(this.interactivityState.currentIndexDrag);
                // drag happened - disable click event
                d3.event.sourceEvent.stopPropagation();
            }
        }

        public accept(visitor: InteractivityVisitor, options: any): void {
            visitor.visitDonutChart(options);
        }

        private updateInternalToMove(data: DonutData, duration: number = 0) {
            // Cache for performance
            var svg = this.svg;
            var pie = this.pie;
            var key = this.key;
            var arc = this.arc;
            var radius = this.radius;
            var previousRadius = this.previousRadius;
            var sliceWidthRatio = this.sliceWidthRatio;

            var existingData = this.svg.select('.slices')
                .selectAll('path' + DonutChart.sliceClass.selector)
                .data().map((d: DonutArcDescriptor) => d.data);

            if (existingData.length === 0) {
                existingData = data.dataPointsToDeprecate;
            }

            var is = this.mergeDatasets(existingData, data.dataPointsToDeprecate);

            var slice = svg.select('.slices')
                .selectAll('path' + DonutChart.sliceClass.selector)
                .data(pie(data.dataPointsToDeprecate), key);

            slice.enter()
                .insert('path')
                .classed(DonutChart.sliceClass.class, true)
                .each(function (d) { this._current = d; });

            slice = svg.select('.slices')
                .selectAll('path' + DonutChart.sliceClass.selector)
                .data(pie(is), key);

            var innerRadius = radius * sliceWidthRatio;
            slice
                .style('fill', (d: DonutArcDescriptor) => d.data.color)
                .style('fill-opacity', (d: DonutArcDescriptor) => ColumnUtil.getFillOpacity(d.data.selected, false, false, data.hasHighlights))
                .style('stroke', 'white')
                .transition().duration(duration)
                .attrTween('d', function (d) {
                    var i = d3.interpolate(this._current, d),
                        k = d3.interpolate(previousRadius * DonutChart.InnerArcRadiusRatio
                            , radius * DonutChart.InnerArcRadiusRatio);

                    this._current = i(0);

                    return function (t) {
                        return arc.innerRadius(innerRadius).outerRadius(k(t))(i(t));
                    };
                });

            slice = svg.select('.slices')
                .selectAll('path' + DonutChart.sliceClass.selector)
                .data(pie(data.dataPointsToDeprecate), key);

            slice.exit()
                .transition()
                .delay(duration)
                .duration(0)
                .remove();

            // For interactive chart, there shouldn't be slice labels (as you have the legend).
            if (!this.isInteractive) {
                var layout = DonutChart.getLayout(radius, sliceWidthRatio, this.currentViewport);
                DonutChart.drawDefaultCategoryLabels(this.mainGraphicsContext, data, layout, sliceWidthRatio, radius, this.currentViewport);
            }

            if (data.hasHighlights) {
                // Draw partial highlight slices.
                var highlightSlices = svg
                    .select('.slices')
                    .selectAll('path' + DonutChart.sliceHighlightClass.selector)
                    .data(pie(data.dataPointsToDeprecate), key);

                highlightSlices
                    .enter()
                    .insert('path')
                    .classed(DonutChart.sliceHighlightClass.class, true)
                    .each(function (d) { this._current = d; });

                highlightSlices
                    .style('fill', (d: DonutArcDescriptor) => d.data.color)
                    .style('fill-opacity', 1.0)
                    .style('stroke', 'white')
                    .transition().duration(duration)
                    .attrTween('d', function (d: DonutArcDescriptor) {
                        var i = d3.interpolate(this._current, d),
                            k = d3.interpolate(
                                previousRadius * DonutChart.InnerArcRadiusRatio,
                                DonutChart.getHighlightRadius(radius, sliceWidthRatio, d.data.highlightRatio));

                        this._current = i(0);

                        return function (t) {
                            return arc.innerRadius(innerRadius).outerRadius(k(t))(i(t));
                        };
                    });

                highlightSlices
                    .exit()
                    .transition()
                    .delay(duration)
                    .duration(0)
                    .remove();
            }
            else {
                svg
                    .selectAll('path' + DonutChart.sliceHighlightClass.selector)
                    .transition()
                    .delay(duration)
                    .duration(0)
                    .remove();
            }

            this.assignInteractions(slice, highlightSlices, data);

            TooltipManager.addTooltip(slice, (tooltipEvent: TooltipEvent) => tooltipEvent.data.data.tooltipInfo);
            if (data.hasHighlights) {
                TooltipManager.addTooltip(highlightSlices, (tooltipEvent: TooltipEvent) => tooltipEvent.data.data.tooltipInfo);
            }

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);

            if (this.isInteractive) {
                this.addInteractiveLegendArrow();
                this.interactivityState.interactiveLegend.drawLegend(this.data.dataPointsToDeprecate);
                this.setInteractiveChosenSlice(this.interactivityState.lastChosenInteractiveSliceIndex ? this.interactivityState.lastChosenInteractiveSliceIndex : 0);
            }
        }

        public static drawDefaultShapes(graphicsContext: D3.Selection, donutData: DonutData, layout: DonutLayout, colors: IDataColorPalette, radius: number, defaultColor?: string): D3.UpdateSelection {
            var hasSelection = dataHasSelection(donutData.dataPoints.map(d => d.data));

            var shapes = graphicsContext.select('.slices')
                .selectAll('path' + DonutChart.sliceClass.selector)
                .data(donutData.dataPoints, (d: DonutArcDescriptor) => d.data.identity.getKey());

            shapes.enter()
                .insert('path')
                .classed(DonutChart.sliceClass.class, true);

            shapes
                .style('fill', (d: DonutArcDescriptor) => d.data.color)
                .style('fill-opacity', (d: DonutArcDescriptor) => ColumnUtil.getFillOpacity(d.data.selected, false, hasSelection, donutData.hasHighlights))
                .attr(layout.shapeLayout);

            shapes.exit()
                .remove();

            return shapes;
        }

        public static drawDefaultHighlightShapes(graphicsContext: D3.Selection, donutData: DonutData, layout: DonutLayout, colors: IDataColorPalette, radius: number): D3.UpdateSelection {
            var shapes = graphicsContext.select('.slices')
                .selectAll('path' + DonutChart.sliceHighlightClass.selector)
                .data(donutData.dataPoints.filter((value: DonutArcDescriptor) => value.data.highlightRatio != null), (d: DonutArcDescriptor) => d.data.identity.getKey());

            shapes.enter()
                .insert('path')
                .classed(DonutChart.sliceHighlightClass.class, true)
                .each(function (d) { this._current = d; });

            shapes
                .style('fill', (d: DonutArcDescriptor) => d.data.color)
                .style('fill-opacity', (d: DonutArcDescriptor) => ColumnUtil.getFillOpacity(d.data.selected, true, false, donutData.hasHighlights))
                .style('stroke', 'white')
                .attr(layout.highlightShapeLayout);

            shapes.exit()
                .remove();

            return shapes;
        }

        public static drawDefaultCategoryLabels(graphicsContext: D3.Selection, donutData: DonutData, layout: DonutLayout, sliceWidthRatio: number, radius: number, viewport: IViewport): void {
            /** Multiplier to place the end point of the reference line at 0.05 * radius away from the outer edge of the donut/pie. */
            var arc = d3.svg.arc()
                .innerRadius(0)
                .outerRadius(radius * DonutChart.InnerArcRadiusRatio);
            var outerArc = d3.svg.arc()
                .innerRadius(radius * DonutChart.OuterArcRadiusRatio)
                .outerRadius(radius * DonutChart.OuterArcRadiusRatio);

            if (donutData.dataLabelsSettings.show || donutData.dataLabelsSettings.showCategory) {

                var value2: number = null;

                if (donutData.dataLabelsSettings.show) {
                    //use the model format
                    if (donutData.dataLabelsSettings.displayUnits === 0) {
                        var minY = <number>d3.min(donutData.dataPoints, d => d.data.measure);
                        var maxY = <number>d3.max(donutData.dataPoints, d => d.data.measure);
                        value2 = Math.max(Math.abs(minY), Math.abs(maxY));
                    }
                }
                var labelLayout = dataLabelUtils.getDonutChartLabelLayout(donutData.dataLabelsSettings, radius, outerArc, viewport, value2);

                dataLabelUtils.drawDefaultLabelsForDonutChart(donutData.dataPoints, graphicsContext, labelLayout, viewport, radius, arc, outerArc);
            }
            else
                dataLabelUtils.cleanDataLabels(graphicsContext, true);
        }

        public onClearSelection() {
            if (this.interactivityService)
                this.interactivityService.clearSelection();
        }

        public static getLayout(radius: number, sliceWidthRatio: number, viewport: IViewport): DonutLayout {
            var innerRadius = radius * sliceWidthRatio;
            var arc = d3.svg.arc().innerRadius(innerRadius);
            var arcWithRadius = arc.outerRadius(radius * DonutChart.InnerArcRadiusRatio);
            var fontSize = viewport.height < DonutChart.FontsizeThreshold ? DonutChart.SmallFontSize : DonutChart.NormalFontSize;
            return {
                fontSize: fontSize,
                shapeLayout: {
                    d: (d: DonutArcDescriptor) => {
                        return arcWithRadius(d);
                    }
                },
                highlightShapeLayout: {
                    d: (d: DonutArcDescriptor) => {
                        var highlightArc = arc.outerRadius(DonutChart.getHighlightRadius(radius, sliceWidthRatio, d.data.highlightRatio));
                        return highlightArc(d);
                    }
                },
                zeroShapeLayout: {
                    d: (d: DonutArcDescriptor) => {
                        var zeroWithZeroRadius = arc.outerRadius(innerRadius || DonutChart.EffectiveZeroValue);
                        return zeroWithZeroRadius(d);
                    }
                },
            };
        }

        private static getHighlightRadius(radius: number, sliceWidthRatio: number, highlightRatio: number): number {
            var innerRadius = radius * sliceWidthRatio;
            return innerRadius + highlightRatio * radius * (DonutChart.InnerArcRadiusRatio - sliceWidthRatio);
        }

        public static cullDataByViewport(dataPoints: DonutDataPoint[], maxValue: number, viewport: IViewport): DonutDataPoint[] {
            var estimatedRadius = Math.min(viewport.width, viewport.height) / 2;
            var cullableValue = ((this.invisibleArcLengthInPixels / estimatedRadius) / DonutChart.twoPi) * maxValue; // Value at which slices will be small enough to cull
            var culledDataPoints: DonutDataPoint[] = [];
            for (var i = 0, ilen = dataPoints.length; i < ilen; i++) {
                var dataPoint = dataPoints[i];
                if (dataPoint.measure >= cullableValue) {
                    culledDataPoints.push(dataPoint);
                }
            }
            return culledDataPoints;
        }
    }
    
    /**
     * This class is an interactive legend for the Donut Chart.
     * 
     * Features: It is scrollable indefinitely, using drag gesture
     * when you interact with it, it updates the donut chart itself.
     */    
    class DonutChartInteractiveLegend {

        private static LegendContainerClassName = 'legend-container';
        private static LegendContainerSelector = '.legend-container';
        private static LegendItemClassName = 'legend-item';
        private static LegendItemSelector = '.legend-item';
        private static LegendItemCategoryClassName = 'category';
        private static LegendItemPercentageClassName = 'percentage';
        private static LegendItemValueClassName = 'value';

        private static MaxLegendItemBoxSize = 160;
        private static ItemMargin = 30; // Margin between items
        private static MinimumSwipeDX = 15; // Minimup swipe gesture to create a change in the legend
        private static MinimumItemsInLegendForCycled = 3; // Minimum items in the legend before we cycle it

        private donutChart: DonutChart;
        private legendContainerParent: D3.Selection;
        private legendContainer: D3.Selection;
        private legendContainerWidth: number;
        private data: DonutDataPoint[];
        private colors: IDataColorPalette;
        private visualInitOptions: VisualInitOptions;

        private currentNumberOfLegendItems: number;
        private currentIndex: number;
        private leftMostIndex: number;
        private rightMostIndex: number;
        private currentXOffset: number;
        private legendItemsPositions: { startX: number; boxWidth: number; }[];
        private legendTransitionAnimationDuration: number;

        constructor(donutChart: DonutChart, legendContainer: D3.Selection, colors: IDataColorPalette, visualInitOptions: VisualInitOptions, settings?: DonutChartSettings) {
            this.legendContainerParent = legendContainer;
            this.colors = colors;
            this.donutChart = donutChart;
            this.visualInitOptions = visualInitOptions;
            this.legendItemsPositions = [];

            this.legendTransitionAnimationDuration = settings && settings.legendTransitionAnimationDuration ? settings.legendTransitionAnimationDuration : 0;
        }

        public drawLegend(data: DonutDataPoint[]): void {
            this.data = data;

            this.currentNumberOfLegendItems = data.length;
            this.currentIndex = 0;
            this.leftMostIndex = 0;
            this.rightMostIndex = data.length - 1;

            if (this.legendContainerParent.select(DonutChartInteractiveLegend.LegendContainerSelector).empty()) {
                this.legendContainer = this.legendContainerParent.append('div').classed(DonutChartInteractiveLegend.LegendContainerClassName, true);
            }

            var legendItems = this.legendContainer.selectAll(DonutChartInteractiveLegend.LegendItemSelector).data(data);
            var legendContainerWidth = this.legendContainerWidth = this.legendContainer.node().getBoundingClientRect().width;
            var initialXOffset = legendContainerWidth / 2 - (legendContainerWidth * 0.4 / 2) + DonutChartInteractiveLegend.ItemMargin;
            var currX = initialXOffset;
            this.currentXOffset = initialXOffset;

            // Given the legend item div, create the item values (category, percentage and measure) on top of it.
            var createLegendItem = (itemDiv: JQuery, datum: DonutDataPoint) => {
                // position the legend item
                itemDiv
                    .attr('data-legend-index', datum.index) // assign index for later use
                    .css({
                        'position': 'absolute',
                        'left': currX,
                        //'margin-right': DonutChartInteractiveLegend.ItemMargin + 'px',
                    });

                // Add the category, percentage and value
                var itemCategory = valueFormatter.format(datum.label);
                var itemValue = valueFormatter.format(datum.measure, datum.measureFormat);
                var itemPercentage = valueFormatter.format(datum.percentage, '0.00 %;-0.00 %;0.00 %');
                var itemColor = datum.color;

                // Create basic spans for width calculations
                var itemValueSpan = DonutChartInteractiveLegend.createBasicLegendItemSpan(DonutChartInteractiveLegend.LegendItemValueClassName, itemValue, 11);
                var itemCategorySpan = DonutChartInteractiveLegend.createBasicLegendItemSpan(DonutChartInteractiveLegend.LegendItemCategoryClassName, itemCategory, 11);
                var itemPercentageSpan = DonutChartInteractiveLegend.createBasicLegendItemSpan(DonutChartInteractiveLegend.LegendItemPercentageClassName, itemPercentage, 20);

                // Calculate Legend Box size according to widths and set the width accordingly
                var valueSpanWidth = DonutChartInteractiveLegend.spanWidth(itemValueSpan);
                var categorySpanWidth = DonutChartInteractiveLegend.spanWidth(itemCategorySpan);
                var precentageSpanWidth = DonutChartInteractiveLegend.spanWidth(itemPercentageSpan);
                var currentLegendBoxWidth = DonutChartInteractiveLegend.legendBoxSize(valueSpanWidth, categorySpanWidth, precentageSpanWidth);
                itemDiv.css('width', currentLegendBoxWidth);

                // Calculate margins so that all the spans will be placed in the middle
                var getLeftValue = (spanWidth: number) => {
                    return currentLegendBoxWidth - spanWidth > 0 ? (currentLegendBoxWidth - spanWidth) / 2 : 0;
                };
                var marginLeftValue = getLeftValue(valueSpanWidth);
                var marginLeftCategory = getLeftValue(categorySpanWidth);
                var marginLeftPrecentage = getLeftValue(precentageSpanWidth);

                // Create the actual spans with the right styling and margins so it will be center aligned and add them
                DonutChartInteractiveLegend.createLegendItemSpan(itemCategorySpan, marginLeftCategory);
                DonutChartInteractiveLegend.createLegendItemSpan(itemValueSpan, marginLeftValue);
                DonutChartInteractiveLegend.createLegendItemSpan(itemPercentageSpan, marginLeftPrecentage).css('color', itemColor);

                itemDiv.append(itemCategorySpan);
                itemDiv.append(itemPercentageSpan);
                itemDiv.append(itemValueSpan);

                this.legendItemsPositions.push({
                    startX: currX,
                    boxWidth: currentLegendBoxWidth,
                });
                currX += currentLegendBoxWidth + DonutChartInteractiveLegend.ItemMargin;
            };

            // Create the Legend Items
            legendItems.enter()
                .insert('div')
                .classed(DonutChartInteractiveLegend.LegendItemClassName, true)
                .each(function (d: DonutDataPoint) {
                    createLegendItem($(this), d);
                });

            legendItems.exit().remove();

            // Assign interactions on the legend
            this.assignInteractions();
        }

        public updateLegend(sliceIndex): void {
            if (this.currentNumberOfLegendItems <= 1) return; // If the number of labels is one no updates are needed
            var legendContainerWidth = this.legendContainerWidth;

            this.currentIndex = sliceIndex;
            // "rearrange" legend items if needed, so we would have contnious endless scrolling
            this.updateLabelBlocks(sliceIndex);
            var legendTransitionAnimationDuration = this.legendTransitionAnimationDuration;
            // Transform the legend so that the selected slice would be in the middle
            var nextXOffset = (this.legendItemsPositions[sliceIndex].startX + (this.legendItemsPositions[sliceIndex].boxWidth / 2) - (legendContainerWidth / 2)) * (-1);
            this.legendContainer
                .transition()
                .styleTween('-webkit-transform', (d: any, i: number, a: any) => {
                    return d3.interpolate(
                        SVGUtil.translateWithPixels(this.currentXOffset, 0),
                        SVGUtil.translateWithPixels(nextXOffset, 0));
                })
                .styleTween('transform', (d: any, i: number, a: any) => {
                    return d3.interpolate(
                        SVGUtil.translateWithPixels(this.currentXOffset, 0),
                        SVGUtil.translateWithPixels(nextXOffset, 0));
                })
                .duration(legendTransitionAnimationDuration)
                .ease('bounce')
                .each('end', () => {
                    this.currentXOffset = nextXOffset;
                });
            SVGUtil.flushAllD3TransitionsIfNeeded(this.visualInitOptions);
        }

        private assignInteractions() {
            var currentDX = 0; // keep how much drag had happened
            var hasChanged = false; // flag to indicate if we changed the "center" value in the legend. We only change it once per swipe.

            var dragStart = () => {
                currentDX = 0; // start of drag gesture
                hasChanged = false;
            };

            var dragMove = () => {
                currentDX += d3.event.dx;
                // Detect if swipe occured and if the index already changed in this drag
                if (hasChanged || Math.abs(currentDX) < DonutChartInteractiveLegend.MinimumSwipeDX) return;

                var dragDirectionLeft = (currentDX < 0);
                this.dragLegend(dragDirectionLeft);
                hasChanged = true;
            };

            var drag = d3.behavior.drag()
                .origin(Object)
                .on('drag', dragMove)
                .on('dragstart', dragStart);

            this.legendContainer.call(drag);
        }

        private dragLegend(dragDirectionLeft: boolean): void {

            if (this.currentNumberOfLegendItems > (DonutChartInteractiveLegend.MinimumItemsInLegendForCycled - 1)) {
                this.currentIndex = this.getCyclingCurrentIndex(dragDirectionLeft);
            } else {
                if (this.shouldChangeIndexInNonCycling(dragDirectionLeft)) {
                    if (dragDirectionLeft) {
                        this.currentIndex++;
                    } else {
                        this.currentIndex--;
                    }
                }
            }
            this.donutChart.setInteractiveChosenSlice(this.currentIndex);
        }

        private shouldChangeIndexInNonCycling(dragDirectionLeft: boolean): boolean {
            if ((this.currentIndex === 0 && !dragDirectionLeft) || (this.currentIndex === (this.currentNumberOfLegendItems - 1) && dragDirectionLeft)) {
                return false;
            }
            return true;
        }

        private getCyclingCurrentIndex(dragDirectionLeft: boolean): number {
            var dataLen = this.data.length;
            var delta = dragDirectionLeft ? 1 : -1;
            var newIndex = (this.currentIndex + delta) % (dataLen || 1); // modolu of negative number stays negative on javascript
            return (newIndex < 0) ? newIndex + dataLen : newIndex;
        }

        private updateLegendItemsBlocks(rightSidedShift: boolean, numberOfLegendItemsBlocksToShift: number) {
            var legendContainer$ = $(this.legendContainer[0]);

            if (rightSidedShift) {
                var smallestItem = legendContainer$.find('[data-legend-index=' + this.leftMostIndex + ']');
                smallestItem.remove().insertAfter(legendContainer$.find('[data-legend-index=' + this.rightMostIndex + ']'));
                var newX = this.legendItemsPositions[this.rightMostIndex].startX + this.legendItemsPositions[this.rightMostIndex].boxWidth + DonutChartInteractiveLegend.ItemMargin;
                this.legendItemsPositions[this.leftMostIndex].startX = newX;
                smallestItem.css('left', newX);

                this.rightMostIndex = this.leftMostIndex;
                this.leftMostIndex = (this.leftMostIndex + 1) % this.data.length;
            } else {
                var highestItem = legendContainer$.find('[data-legend-index=' + this.rightMostIndex + ']');
                highestItem.remove().insertBefore(legendContainer$.find('[data-legend-index=' + this.leftMostIndex + ']'));
                var newX = this.legendItemsPositions[this.leftMostIndex].startX - this.legendItemsPositions[this.rightMostIndex].boxWidth - DonutChartInteractiveLegend.ItemMargin;
                this.legendItemsPositions[this.rightMostIndex].startX = newX;
                highestItem.css('left', newX);

                this.leftMostIndex = this.rightMostIndex;
                this.rightMostIndex = (this.rightMostIndex - 1) === -1 ? (this.legendItemsPositions.length - 1) : (this.rightMostIndex - 1);
            }

            if ((numberOfLegendItemsBlocksToShift - 1) !== 0) {
                this.updateLegendItemsBlocks(rightSidedShift, (numberOfLegendItemsBlocksToShift - 1));
            }
        }

        /** Update the legend items, allowing for endless rotation */
        private updateLabelBlocks(index: number) {

            if (this.currentNumberOfLegendItems > DonutChartInteractiveLegend.MinimumItemsInLegendForCycled) {
                // The idea of the four if's is to keep two labels before and after the current one so it will fill the screen.

                // If the index of the slice is the highest currently availble add 2 labels "ahead" of it
                if (this.rightMostIndex === index) this.updateLegendItemsBlocks(true, 2);

                // If the index of the slice is the lowest currently availble add 2 labels "before" it
                if (this.leftMostIndex === index) this.updateLegendItemsBlocks(false, 2);

                // If the index of the slice is the second highest currently availble add a labels "ahead" of it
                if (this.rightMostIndex === (index + 1) || ((this.rightMostIndex === 0) && (index === (this.currentNumberOfLegendItems - 1)))) this.updateLegendItemsBlocks(true, 1);

                // If the index of the slice is the second lowest currently availble add a labels "before" it
                if (this.leftMostIndex === (index - 1) || ((this.leftMostIndex === (this.currentNumberOfLegendItems - 1) && (index === 0)))) this.updateLegendItemsBlocks(false, 1);

            } else {

                if (this.currentNumberOfLegendItems === DonutChartInteractiveLegend.MinimumItemsInLegendForCycled) {
                    // If the index of the slice is the highest currently availble add a label "ahead" of it
                    if (this.rightMostIndex === index) this.updateLegendItemsBlocks(true, 1);

                    // If the index of the slice is the lowest currently availble add a label "before" it
                    if (this.leftMostIndex === index) this.updateLegendItemsBlocks(false, 1);
                }
            }
        }

        private static createBasicLegendItemSpan(spanClass: string, text: string, fontSize: number): JQuery {
            return $('<span/>')
                .addClass(spanClass)
                .css({
                    'white-space': 'nowrap',
                    'font-size': fontSize + 'px',
                })
                .text(text);
        }

        /** This method alters the given span and sets it to the final legen item span style. */
        private static createLegendItemSpan(existingSpan: JQuery, marginLeft: number): JQuery {
            existingSpan
                .css({
                    'overflow': 'hidden',
                    'text-overflow': 'ellipsis',
                    'display': 'inline-block',
                    'width': '100%',
                    'margin-left': marginLeft
                });
            return existingSpan;
        }

        /** Caclulte entire legend box size according to its building spans */
        private static legendBoxSize(valueSpanWidth: number, categorySpanWidth: number, precentageSpanWidth: number): number {
            var boxSize = valueSpanWidth > categorySpanWidth ? valueSpanWidth : categorySpanWidth;
            boxSize = boxSize > precentageSpanWidth ? boxSize : precentageSpanWidth;
            boxSize = boxSize > DonutChartInteractiveLegend.MaxLegendItemBoxSize ? DonutChartInteractiveLegend.MaxLegendItemBoxSize : (boxSize + 2);
            return boxSize;
        }

        private static FakeElementSpan: JQuery;
        private static spanWidth(span: JQuery): any {
            if (!this.FakeElementSpan) {
                this.FakeElementSpan = $('<span>').hide().appendTo(document.body);
            }
            this.FakeElementSpan.empty();
            this.FakeElementSpan.append(span);
            return this.FakeElementSpan.width();
        }
    }

    module DonutChartConversion {

        interface ConvertedDataPoint {
            identity: SelectionId;
            measureFormat: string;
            nonHighlight: MeasureAndValue;
            highlight: MeasureAndValue;
            index: number;
            label: any;
            categoryLabel: string;
            color: string;
            seriesIndex?: number;
        };

        interface MeasureAndValue {
            measure: number;
            value: number;
        }

        export class DonutChartConverter {
            private dataViewCategorical: DataViewCategorical;
            private dataViewMetadata: DataViewMetadata;
            private highlightsOverflow: boolean;
            private total: number;
            private highlightTotal: number;
            private grouped: DataViewValueColumnGroup[];
            private isMultiMeasure: boolean;
            private isSingleMeasure: boolean;
            private seriesCount: number;
            private categoryIdentities: DataViewScopeIdentity[];
            private categoryValues: any[];
            private allCategoryObjects: DataViewObjects[];
            private categoryColumnRef: data.SQExpr[];
            private legendDataPoints: LegendDataPoint[];
            private colorHelper: ColorHelper;
            private categoryFormatString: string;

            public hasHighlights: boolean;
            public dataPoints: DonutDataPoint[];
            public legendData: LegendData;
            public dataLabelsSettings: VisualDataLabelsSettings;
            public legendObjectProperties: DataViewObject;
            public maxValue: number;

            public constructor(dataView: DataView, colors: IDataColorPalette) {
                var dataViewCategorical = dataView.categorical;
                this.dataViewCategorical = dataViewCategorical;
                this.dataViewMetadata = dataView.metadata;

                this.seriesCount = dataViewCategorical.values ? dataViewCategorical.values.length : 0;
                this.colorHelper = new ColorHelper(colors, donutChartProps.dataPoint.fill);
                this.maxValue = 0;

                if (dataViewCategorical.categories && dataViewCategorical.categories.length > 0) {
                    var category = dataViewCategorical.categories[0];
                    this.categoryIdentities = category.identity;
                    this.categoryValues = category.values;
                    this.allCategoryObjects = category.objects;
                    this.categoryColumnRef = category.identityFields;
                    this.categoryFormatString = valueFormatter.getFormatString(category.source, donutChartProps.general.formatString);
                }

                var grouped = this.grouped = dataViewCategorical && dataViewCategorical.values ? dataViewCategorical.values.grouped() : undefined;
                this.isMultiMeasure = grouped && grouped.length > 0 && grouped[0].values && grouped[0].values.length > 1;
                this.isSingleMeasure = grouped && grouped.length === 1 && grouped[0].values && grouped[0].values.length === 1;

                this.hasHighlights = this.seriesCount > 0 && !!dataViewCategorical.values[0].highlights;
                this.highlightsOverflow = false;
                this.total = 0;
                this.highlightTotal = 0;
                this.dataPoints = [];
                this.legendDataPoints = [];
                this.dataLabelsSettings = null;

                for (var seriesIndex = 0; seriesIndex < this.seriesCount; seriesIndex++) {
                    var seriesData = dataViewCategorical.values[seriesIndex];
                    for (var measureIndex = 0; measureIndex < seriesData.values.length; measureIndex++) {
                        this.total += Math.abs(seriesData.values[measureIndex]);
                        this.highlightTotal += this.hasHighlights ? Math.abs(seriesData.highlights[measureIndex]) : 0;
                    }
                }
            }

            public convert(): void {
                var convertedData: ConvertedDataPoint[];
                if (this.total !== 0) {
                    // If category exists, we render labels using category values. If not, we render labels
                    // using measure labels.
                    if (this.categoryValues) {
                        convertedData = this.convertCategoricalWithSlicing();
                    }
                    else {
                        if (this.isSingleMeasure || this.isMultiMeasure) {
                            // Either single- or multi-measure (no category or series)
                            convertedData = this.convertMeasures();
                        }
                        else {
                            // Series but no category.
                            convertedData = this.convertSeries();
                        }
                    }
                }
                else {
                    convertedData = [];
                }

                // Check if any of the highlight values are > non-highlight values
                var highlightsOverflow = false;
                for (var i = 0, dataPointCount = convertedData.length; i < dataPointCount && !highlightsOverflow; i++) {
                    var point = convertedData[i];
                    if (Math.abs(point.highlight.measure) > Math.abs(point.nonHighlight.measure)) {
                        highlightsOverflow = true;
                    }
                }

                // Create data labels settings
                this.dataLabelsSettings = this.convertDataLableSettings();

                var dataViewMetadata = this.dataViewMetadata;
                if (dataViewMetadata) {
                    var objects: DataViewObjects = dataViewMetadata.objects;
                    if (objects) {
                        this.legendObjectProperties = objects['legend'];
                    }
                }

                this.dataPoints = [];
                var formatStringProp = donutChartProps.general.formatString;

                for (var i = 0, dataPointCount = convertedData.length; i < dataPointCount; i++) {
                    var point = convertedData[i];
                    var measure = point.nonHighlight.measure;
                    var percentage = (this.total > 0) ? point.nonHighlight.value / this.total : 0.0;
                    var highlightRatio = 0;
                    if (point.nonHighlight.value > this.maxValue)
                        this.maxValue = point.nonHighlight.value;
                    if (point.highlight.value > this.maxValue)
                        this.maxValue = point.nonHighlight.value;

                    if (this.hasHighlights) {
                        // When any highlight value is greater than the corresponding non-highlight value
                        // we just render all of the highlight values and discard the non-highlight values.
                        if (highlightsOverflow) {
                            measure = point.highlight.measure;
                            percentage = (this.highlightTotal > 0) ? point.highlight.value / this.highlightTotal : 0.0;
                            highlightRatio = 1;
                        }
                        else {
                            highlightRatio = point.highlight.value / point.nonHighlight.value;
                        }

                        if (!highlightRatio) {
                            highlightRatio = DonutChart.EffectiveZeroValue;
                        }
                    }

                    var value = measure;
                    var categoryValue = point.categoryLabel;
                    var categorical = this.dataViewCategorical;
                    var valueIndex: number = categorical.categories ? null : i;
                    valueIndex = point.seriesIndex !== undefined ? point.seriesIndex : valueIndex;
                    var valuesMetadata = categorical.values[valueIndex].source;
                    var highlightedValue: number = this.hasHighlights && point.highlight.value !== 0 ? point.highlight.measure : undefined;
                    var tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, categorical.categories, categoryValue, categorical.values, value, null, valueIndex, highlightedValue);

                    this.dataPoints.push({
                        identity: point.identity,
                        measure: measure,
                        measureFormat: point.measureFormat,
                        percentage: percentage,
                        index: point.index,
                        label: point.label,
                        highlightRatio: highlightRatio,
                        selected: false,
                        tooltipInfo: tooltipInfo,
                        color: point.color,
                        labelColor: this.dataLabelsSettings.labelColor,
                        labelFormatString: valuesMetadata.format
                    });
                }

                this.legendData = { title: this.getLegendTitle(), dataPoints: this.legendDataPoints };
            }

            private getLegendTitle(): string {
                if (this.total !== 0) {
                    // If category exists, we render title using category source. If not, we render title
                    // using measure.
                    var dvValuesSourceName = this.dataViewCategorical.values && this.dataViewCategorical.values.source
                        ? this.dataViewCategorical.values.source.displayName : "";
                    var dvCategorySourceName = this.dataViewCategorical.categories && this.dataViewCategorical.categories.length > 0 && this.dataViewCategorical.categories[0].source
                        ? this.dataViewCategorical.categories[0].source.displayName : "";
                    if (this.categoryValues) {
                        return dvCategorySourceName;
                    }
                    else {
                        return dvValuesSourceName;
                    }
                }
                else {
                    return "";
                }
            }

            private convertCategoricalWithSlicing(): ConvertedDataPoint[] {
                var dataViewCategorical = this.dataViewCategorical;
                var formatStringProp = donutChartProps.general.formatString;
                var dataPoints: ConvertedDataPoint[] = [];

                for (var categoryIndex = 0, categoryCount = this.categoryValues.length; categoryIndex < categoryCount; categoryIndex++) {
                    var categoryValue = this.categoryValues[categoryIndex];
                    var thisCategoryObjects = this.allCategoryObjects ? this.allCategoryObjects[categoryIndex] : undefined;

                    var legendIdentity = SelectionId.createWithId(this.categoryIdentities[categoryIndex]);
                    var color = this.colorHelper.getColorForSeriesValue(thisCategoryObjects, this.categoryColumnRef, categoryValue);
                    var categoryLabel = valueFormatter.format(categoryValue, this.categoryFormatString);

                    // Series are either measures in the multi-measure case, or the single series otherwise
                    for (var seriesIndex = 0; seriesIndex < this.seriesCount; seriesIndex++) {
                        var seriesData = dataViewCategorical.values[seriesIndex];

                        var label = this.isSingleMeasure
                            ? categoryLabel
                            : converterHelper.getFormattedLegendLabel(seriesData.source, dataViewCategorical.values, formatStringProp);

                        var nonHighlight = seriesData.values[categoryIndex] || 0;
                        var highlight = this.hasHighlights ? seriesData.highlights[categoryIndex] || 0 : 0;

                        var identity: SelectionId = this.isMultiMeasure
                            ? SelectionId.createWithIdAndMeasure(this.categoryIdentities[categoryIndex], seriesData.source.queryName)
                            : SelectionId.createWithIds(this.categoryIdentities[categoryIndex], seriesData.identity);

                        var dataPoint: ConvertedDataPoint = {
                            identity: identity,
                            measureFormat: valueFormatter.getFormatString(seriesData.source, formatStringProp, true),
                            nonHighlight: <MeasureAndValue> {
                                measure: nonHighlight,
                                value: Math.abs(nonHighlight),
                            },
                            highlight: <MeasureAndValue> {
                                measure: highlight,
                                value: Math.abs(highlight),
                            },
                            index: categoryIndex,
                            label: label,
                            categoryLabel: categoryLabel,
                            color: color,
                            seriesIndex: seriesIndex
                        };
                        dataPoints.push(dataPoint);
                    }

                    this.legendDataPoints.push({
                        label: categoryLabel,
                        color: color,
                        icon: LegendIcon.Box,
                        identity: legendIdentity,
                        selected: false
                    });
                }

                return dataPoints;
            }

            private convertMeasures(): ConvertedDataPoint[] {
                var dataViewCategorical = this.dataViewCategorical;
                var dataPoints: ConvertedDataPoint[] = [];
                var formatStringProp = donutChartProps.general.formatString;

                for (var measureIndex = 0; measureIndex < this.seriesCount; measureIndex++) {
                    var measureData = dataViewCategorical.values[measureIndex];
                    var measureFormat = valueFormatter.getFormatString(measureData.source, formatStringProp, true);
                    var measureLabel = measureData.source.displayName;
                    var identity = SelectionId.createWithMeasure(measureData.source.queryName);

                    debug.assert(measureData.values.length > 0, 'measure should have data points');
                    debug.assert(!this.hasHighlights || measureData.highlights.length > 0, 'measure with highlights should have highlight data points');
                    var nonHighlight = measureData.values[0] || 0;
                    var highlight = this.hasHighlights ? measureData.highlights[0] || 0 : 0;

                    var color = this.colorHelper.getColorForMeasure(measureData.source.objects, measureData.source.queryName);

                    var dataPoint: ConvertedDataPoint = {
                        identity: identity,
                        measureFormat: measureFormat,
                        nonHighlight: <MeasureAndValue> {
                            measure: nonHighlight,
                            value: Math.abs(nonHighlight),
                        },
                        highlight: <MeasureAndValue> {
                            measure: highlight,
                            value: Math.abs(highlight),
                        },
                        index: measureIndex,
                        label: measureLabel,
                        categoryLabel: measureLabel,
                        color: color
                    };
                    dataPoints.push(dataPoint);

                    this.legendDataPoints.push({
                        label: dataPoint.label,
                        color: dataPoint.color,
                        icon: LegendIcon.Box,
                        identity: dataPoint.identity,
                        selected: false
                    });
                }

                return dataPoints;
            }

            private convertSeries(): ConvertedDataPoint[] {
                var dataViewCategorical = this.dataViewCategorical;
                var dataPoints: ConvertedDataPoint[] = [];
                var formatStringProp = donutChartProps.general.formatString;

                for (var seriesIndex = 0; seriesIndex < this.seriesCount; seriesIndex++) {
                    var seriesData = dataViewCategorical.values[seriesIndex];
                    var seriesFormat = valueFormatter.getFormatString(seriesData.source, formatStringProp, true);
                    var label = converterHelper.getFormattedLegendLabel(seriesData.source, dataViewCategorical.values, formatStringProp);
                    var identity = SelectionId.createWithId(seriesData.identity);
                    var seriesName = converterHelper.getSeriesName(seriesData.source);
                    var seriesObjects = seriesData.objects && seriesData.objects[0];

                    debug.assert(seriesData.values.length > 0, 'measure should have data points');
                    debug.assert(!this.hasHighlights || seriesData.highlights.length > 0, 'measure with highlights should have highlight data points');
                    var nonHighlight = seriesData.values[0] || 0;
                    var highlight = this.hasHighlights ? seriesData.highlights[0] || 0 : 0;

                    var color = this.colorHelper.getColorForSeriesValue(seriesObjects, dataViewCategorical.values.identityFields, seriesName);

                    var dataPoint: ConvertedDataPoint = {
                        identity: identity,
                        measureFormat: seriesFormat,
                        nonHighlight: <MeasureAndValue> {
                            measure: nonHighlight,
                            value: Math.abs(nonHighlight),
                        },
                        highlight: <MeasureAndValue> {
                            measure: highlight,
                            value: Math.abs(highlight),
                        },
                        index: seriesIndex,
                        label: label,
                        categoryLabel: label,
                        color: color,
                        seriesIndex: seriesIndex
                    };
                    dataPoints.push(dataPoint);

                    this.legendDataPoints.push({
                        label: dataPoint.label,
                        color: dataPoint.color,
                        icon: LegendIcon.Box,
                        identity: dataPoint.identity,
                        selected: false
                    });
                }

                return dataPoints;
            }

            private convertDataLableSettings(): VisualDataLabelsSettings {
                var dataViewMetadata = this.dataViewMetadata;
                var dataLabelsSettings = dataLabelUtils.getDefaultDonutLabelSettings();

                if (dataViewMetadata) {
                    var objects: DataViewObjects = dataViewMetadata.objects;
                    if (objects) {
                        // Handle lables settings
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

                        var categoryLabelsObject = objects['categoryLabels'];
                        if (categoryLabelsObject) {
                            // Update category label visibility
                            var category = <boolean>categoryLabelsObject['show'];
                            if (category !== undefined)
                                dataLabelsSettings.showCategory = category;
                        }
                    }
                }

                return dataLabelsSettings;
            }
        }
    }
}