﻿/*
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

/// <reference path="_references.ts"/>

module powerbi.visuals {
    
    import SampleData = powerbi.visuals.sampleData.SampleData;

    export class HostControls {

        private visualElement: IVisual;
        private dataViewsSelect: JQuery;

        // Represents sample data views used by visualization elements.
        private sampleDataViews;
        private animation_duration: number = 250;
        private suppressAnimations: boolean = false;

        private suppressAnimationsElement: JQuery;
        private animationDurationElement: JQuery;

        constructor(parent: JQuery) {
            parent.find('#randomize').on('click', () => this.randomize());

            this.dataViewsSelect = parent.find('#dataViewsSelect').first();

            this.suppressAnimationsElement = parent.find('input[name=suppressAnimations]').first();
            this.suppressAnimationsElement.on('change', () => this.onChangeSuppressAnimations());
            
            this.animationDurationElement = parent.find('input[name=animation_duration]').first();
            this.animationDurationElement.on('change', () => this.onChangeDuration());
        }
        
        public setVisual(visualElement: IVisual): void {
            this.visualElement = visualElement;
        }

        private randomize(): void {
            this.sampleDataViews.randomize();
            this.onChange();
        }

        private onChangeDuration(): void {
            this.animation_duration = parseInt(this.animationDurationElement.val(), 10);
            this.onChange();
        }

        private onChangeSuppressAnimations(): void {
            this.suppressAnimations = this.suppressAnimationsElement.val();
            this.onChange();
        }
                
        private onChange(): void {
            this.visualElement.onDataChanged({
                dataViews: this.sampleDataViews.getDataViews(),
                suppressAnimations: this.suppressAnimations
            });
        }

        public onPluginChange(pluginName: string): void {
            this.dataViewsSelect.empty();

            var dataViews = SampleData.getSamplesByPluginName(pluginName);
            var defaultDataView;

            dataViews.forEach((item, i) => {
                var option: JQuery = $('<option>');

                option.val(item.getName());
                option.text(item.getDisplayName());

                if (i === 0) {
                    option.attr('selected', 'selected');
                    defaultDataView = item.getName();
                }
                this.dataViewsSelect.append(option);
            });

            this.dataViewsSelect.change(() => this.onChangeDataViewSelection(this.dataViewsSelect.val()));

            if (defaultDataView) {
                this.onChangeDataViewSelection(defaultDataView);
            }
        }
        
        private onChangeDataViewSelection(sampleName: string): void {
            this.sampleDataViews = SampleData.getDataViewsBySampleName(sampleName);
            this.onChange();
        }

    }
}
