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

/// <reference path="../../_references.ts"/>

// tslint rule disabled because of tslint (version >= v2.2.0-beta) thinks that 'SVGUtil' is unused var. 
/* tslint:disable:no-unused-variable */
import SVGUtil = powerbi.visuals.SVGUtil;

describe("SvgUtil tests", () => {
    it('validate the pie chart transform parsing logic for Chrome', () => {
        var transform = 'translate(110.21,46.5)';
        var parsedTransform = SVGUtil.parseTranslateTransform(transform);

        expect(parsedTransform.x).toBe('110.21');
        expect(parsedTransform.y).toBe('46.5');
    });

    it('validate the pie chart transform parsing logic for IE', () => {     
        var transform = 'translate(110.6 34.56)';
        var parsedTransform = SVGUtil.parseTranslateTransform(transform);

        expect(parsedTransform.x).toBe('110.6');
        expect(parsedTransform.y).toBe('34.56');
    });

    it('validate transform parsing logic with no y value',() => {
        var transform = 'translate(110.6)';
        var parsedTransform = SVGUtil.parseTranslateTransform(transform);

        expect(parsedTransform.x).toBe('110.6');
        expect(parsedTransform.y).toBe('0');
    });

    it('validate convertToPixelString', () => {
        var pixelString = SVGUtil.convertToPixelString(34);

        expect(pixelString).toBe('34px');
    });
});
