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

/// <reference path="../_references.ts"/>

module powerbi.visuals.sampleDataViews {

    import DataViewTransform = powerbi.data.DataViewTransform;
    import ValueType = powerbi.ValueType;
    import PrimitiveType = powerbi.PrimitiveType;
    
    export class SimpleGaugeData extends SampleDataViews implements ISampleDataViewsMethods {

        public name: string = "SimpleGaugeData";
        public displayName: string = "Simple gauge data";

        public visuals: string[] = ['gauge',
        ];

        public getDataViews(): DataView[] {
            var gaugeDataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    {
                        displayName: 'col1',
                        roles: { 'Y': true },
                        isMeasure: true,
                        objects: { general: { formatString: '$0' } },
                    }, {
                        displayName: 'col2',
                        roles: { 'MinValue': true },
                        isMeasure: true
                    }, {
                        displayName: 'col3',
                        roles: { 'MaxValue': true },
                        isMeasure: true
                    }, {
                        displayName: 'col4',
                        roles: { 'TargetValue': true },
                        isMeasure: true
                    }],
                groups: [],
                measures: [0],
            };

            return [{
                metadata: gaugeDataViewMetadata,
                single: { value: 500 },
                categorical: {
                    values: DataViewTransform.createValueColumns([
                        {
                            source: gaugeDataViewMetadata.columns[0],
                            values: [500],
                        }, {
                            source: gaugeDataViewMetadata.columns[1],
                            values: [0],
                        }, {
                            source: gaugeDataViewMetadata.columns[2],
                            values: [300],
                        }, {
                            source: gaugeDataViewMetadata.columns[3],
                            values: [200],
                        }])
                }
            }];
        }

        public randomize(): void {
        }
        
    }
}