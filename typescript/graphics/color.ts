/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, clamp, clamp01, lerp } from "../utils";
import type { Color4 } from "./material";

export type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno" | "cividis" | "coolwarm" | "twilight" | "hsv";

export type BuiltinPaletteName = "tab10" | "okabeito" | "chartjs";

export type ColormapColorSpace = "srgb" | "linear";

export type ColormapFilter = "linear" | "nearest";

export type ColormapInterpolation = "srgb" | "linear" | "oklab";

export type ColormapStop = Color4 | { t: number; color: Color4; };

export type ColormapDescriptor = {
    resolution?: number;
    filter?: ColormapFilter;
    colorSpace?: ColormapColorSpace;
    interpolation?: ColormapInterpolation;
};

export type DomainColorMode = "domain" | "argument" | "modulus";

export type DomainColorDescriptor = {
    colormap?: BuiltinColormapName | Colormap;
    mode?: DomainColorMode;
    range?: [number, number];
};

type ColormapGPUResources = {
    texture: GPUTexture | null;
    view: GPUTextureView;
    sampler: GPUSampler;
    width: number;
    filter: ColormapFilter;
};

const BUILTIN_RESOLUTION = 256;
const MAX_RESOLUTION = 8192;
const BUILTIN_COLORMAP_NAMES: ReadonlyArray<BuiltinColormapName> = ["grayscale", "turbo", "viridis", "magma", "plasma", "inferno", "cividis", "coolwarm", "twilight", "hsv"];
const BUILTIN_PALETTE_NAMES: ReadonlyArray<BuiltinPaletteName> = ["tab10", "okabeito", "chartjs"];

// Viridis, magma, plasma, inferno, and cividis (Nuñez, Anderton, and Renslow) are from matplotlib, turbo is by Google, coolwarm is by Kenneth Moreland, twilight is by Bastian Lehmann (via matplotlib), tab10 is matplotlib's default cycle, okabeito is by Masataka Okabe and Kei Ito, and chartjs is Chart.js's default palette.
const BUILTIN_RGBA8_BASE64: Record<Exclude<BuiltinColormapName, "grayscale" | "hsv">, string> = {
    turbo:
        "MBI7/zEVQv8yGEr/NBtR/zUeWP82IV//NyNl/zgmbP85KXL/Oix5/zsvf/88MoX/PDWL/z03kf8+Opb/"
            + "Pz2c/0BAof9AQ6b/QUWr/0FIsP9CS7X/Q066/0NQvv9DU8L/RFbH/0RYy/9FW87/RV7S/0Vg1v9FY9n/"
            + "Rmbd/0Zo4P9Ga+P/Rm3m/0Zw6P9Gc+v/RnXt/0Z48P9GevL/Rn30/0Z/9v9Ggvj/RYT5/0WH+/9Fifz/"
            + "RIz9/0OO/f9Ckf7/QZP+/0CW/v8/mP7/Ppv+/zyd/f87oPz/OaL8/zil+/82qPn/NKr4/zOs9v8xr/X/"
            + "L7Hz/y208f8rtu//Krnt/yi76/8mven/JcDm/yPC5P8hxOH/IMbf/x7J3P8dy9r/HM3X/xvP1P8a0dL/"
            + "GdPP/xjVzP8Y18r/F9nH/xfaxP8X3ML/F96//xjgvf8Y4br/GeO4/xrktv8b5bT/Heex/x7or/8g6az/"
            + "Iuup/yTspv8n7aP/Ke6g/yzvnf8v8Jr/MvGX/zXzlP849JH/O/SN/z/1iv9C9of/RveD/0r4gP9N+Xz/"
            + "Ufl5/1X6dv9Z+3L/Xftv/2H8bP9l/Gj/af1l/239Yv9x/V//dP5c/3j+Wf98/lb/gP5T/4T+UP+H/k3/"
            + "i/5L/47+SP+S/kb/lf5E/5j+Qv+b/UD/nv0+/6H8Pf+k/Dv/pvs6/6n7Of+s+jf/rvk3/7H4Nv+z+DX/"
            + "tvc1/7n1NP+79DT/vvM0/8DyM//D8TP/xe8z/8juM//K7TP/zes0/8/qNP/R6DT/1Oc1/9blNf/Y4zX/"
            + "2uI2/93gNv/f3jb/4dw3/+PaN//l2Dj/59c4/+jVOP/q0zn/7NE5/+3POf/vzTn/8Ms6//LIOv/zxjr/"
            + "9MQ6//bCOv/3wDn/+L45//m8Of/5ujj/+rc3//u1N//7szb//LA1//yuNP/9qzP//aky//2mMf/9ozD/"
            + "/qEv//6eLv/+my3//pgs//2VK//9kin//Y8o//2MJ//8iSb//IYk//uDI//7gCL/+n0g//p6H//5dx7/"
            + "+HQc//dxG//3bhr/9msY//VoF//0ZRb/82MV//JgFP/xXRP/71oR/+5YEP/tVQ//7FIO/+pQDf/pTQ3/"
            + "6EsM/+ZJC//lRgr/40QK/+JCCf/gQAj/3j4I/908B//bOgf/2TgG/9c2Bv/WNAX/1DIF/9IwBf/QLwT/"
            + "zi0E/8srA//JKQP/xygD/8UmAv/DJAL/wCMC/74hAv+7HwH/uR4B/7YcAf+0GwH/sRkB/64YAf+sFgH/"
            + "qRUB/6YUAf+jEgH/oBEB/50QAf+aDgH/lw0B/5QMAf+RCwH/jgoB/4sJAf+HCAH/hAcB/4EGAv99BQL/"
            + "egQC/w==",
    viridis:
        "RAFU/0QCVf9EA1f/RQVY/0UGWv9FCFv/Rglc/0YLXv9GDF//Rg5h/0cPYv9HEWP/RxJl/0cUZv9HFWf/"
            + "RxZp/0cYav9IGWv/SBps/0gcbv9IHW//SB5w/0ggcf9IIXL/SCJz/0gjdP9HJXX/RyZ2/0cnd/9HKHj/"
            + "Ryp5/0crev9HLHv/Ri18/0YvfP9GMH3/RjF+/0Uyf/9FNH//RTWA/0U2gf9EN4H/RDmC/0M6g/9DO4P/"
            + "QzyE/0I9hP9CPoX/QkCF/0FBhv9BQob/QEOH/0BEh/8/RYf/P0eI/z5IiP8+SYn/PUqJ/z1Lif89TIn/"
            + "PE2K/zxOiv87UIr/O1GK/zpSi/86U4v/OVSL/zlVi/84Vov/OFeM/zdYjP83WYz/NlqM/zZbjP81XIz/"
            + "NV2M/zRejf80X43/M2CN/zNhjf8yYo3/MmON/zFkjf8xZY3/MWaN/zBnjf8waI3/L2mN/y9qjf8ua47/"
            + "LmyO/y5tjv8tbo7/LW+O/yxwjv8scY7/LHKO/ytzjv8rdI7/KnWO/yp2jv8qd47/KXiO/yl5jv8oeo7/"
            + "KHqO/yh7jv8nfI7/J32O/yd+jv8mf47/JoCO/yaBjv8lgo7/JYON/ySEjf8khY3/JIaN/yOHjf8jiI3/"
            + "I4mN/yKJjf8iio3/IouN/yGMjf8hjYz/IY6M/yCPjP8gkIz/IJGM/x+SjP8fk4v/H5SL/x+Vi/8flov/"
            + "HpeK/x6Yiv8emYr/HpmK/x6aif8em4n/HpyJ/x6diP8enoj/Hp+I/x6gh/8foYf/H6KG/x+jhv8gpIX/"
            + "IKWF/yGmhf8hp4T/IqeE/yOog/8jqYL/JKqC/yWrgf8mrIH/J62A/yiuf/8pr3//KrB+/yuxff8ssX3/"
            + "LrJ8/y+ze/8wtHr/MrV6/zO2ef81t3j/Nrh3/zi5dv85uXb/O7p1/z27dP8+vHP/QL1y/0K+cf9EvnD/"
            + "Rb9v/0fAbv9JwW3/S8Js/03Ca/9Pw2n/UcRo/1PFZ/9Vxmb/V8Zl/1nHZP9byGL/Xslh/2DJYP9iyl//"
            + "ZMtd/2fMXP9pzFv/a81Z/23OWP9wzlb/cs9V/3TQVP930FL/edFR/3zST/9+0k7/gdNM/4PTS/+G1En/"
            + "iNVH/4vVRv+N1kT/kNZD/5LXQf+V1z//l9g+/5rYPP+d2Tr/n9k4/6LaN/+l2jX/p9sz/6rbMv+t3DD/"
            + "r9wu/7LdLP+13Sv/t90p/7reJ/+93ib/v98k/8LfIv/F3yH/x+Af/8rgHv/N4B3/z+Ec/9LhG//U4Rr/"
            + "1+IZ/9riGP/c4hj/3+MY/+HjGP/k4xj/5+QZ/+nkGf/s5Br/7uUb//HlHP/z5R7/9uYf//jmIf/65iL/"
            + "/eck/w==",
    magma:
        "AAAD/wAABP8AAAb/AQAH/wEBCf8BAQv/AgIN/wICD/8DAxH/BAMT/wQEFf8FBBf/BgUZ/wcFG/8IBh3/"
            + "CQcf/woHIv8LCCT/DAkm/w0KKP8OCir/Dwss/xAML/8RDDH/Eg0z/xQNNf8VDjj/Fg46/xcPPP8YDz//"
            + "GhBB/xsQRP8cEEb/HhBJ/x8RS/8gEU3/IhFQ/yMRUv8lEVX/JhFX/ygRWf8qEVz/KxFe/y0QYP8vEGL/"
            + "MBBl/zIQZ/80EGj/NQ9q/zcPbP85D27/Ow9v/zwPcf8+D3L/QA9z/0IPdP9DD3X/RQ92/0cPd/9IEHj/"
            + "ShB5/0sQef9NEXr/TxF7/1ASe/9SEnz/UxN8/1UTff9XFH3/WBV+/1oVfv9bFn7/XRd+/14Xf/9gGH//"
            + "YRh//2MZf/9lGoD/ZhqA/2gbgP9pHID/axyA/2wdgP9uHoH/bx6B/3Efgf9zH4H/dCCB/3Yhgf93IYH/"
            + "eSKB/3oigf98I4H/fiSB/38kgf+BJYH/giWB/4Qmgf+FJoH/hyeB/4kogf+KKIH/jCmA/40pgP+PKoD/"
            + "kSqA/5IrgP+UK4D/lSyA/5csf/+ZLX//mi1//5wuf/+eLn7/ny9+/6Evfv+jMH7/pDB9/6Yxff+nMX3/"
            + "qTJ8/6szfP+sM3v/rjR7/7A0e/+xNXr/szV6/7U2ef+2Nnn/uDd4/7k3eP+7OHf/vTl3/745dv/AOnX/"
            + "wjp1/8M7dP/FPHT/xjxz/8g9cv/KPnL/yz5x/80/cP/OQHD/0EFv/9FCbv/TQm3/1ENt/9ZEbP/XRWv/"
            + "2UZq/9pHaf/cSGn/3Ulo/95KZ//gS2b/4Uxm/+JNZf/kTmT/5VBj/+ZRYv/nUmL/6FRh/+pVYP/rVmD/"
            + "7Fhf/+1ZX//uW17/7l1d/+9eXf/wYF3/8WFc//JjXP/zZVz/82db//RoW//1alv/9Wxb//ZuW//2cFv/"
            + "93Fb//dzXP/4dVz/+Hdc//l5XP/5e13/+X1d//p/Xv/6gF7/+oJf//uEYP/7hmD/+4hh//uKYv/8jGP/"
            + "/I5j//yQZP/8kmX//JNm//2VZ//9l2j//Zlp//2bav/9nWv//Z9s//2hbv/9om///aRw//6mcf/+qHP/"
            + "/qp0//6sdf/+rnb//q94//6xef/+s3v//rV8//63ff/+uX///ruA//68gv/+voP//sCF//7Chv/+xIj/"
            + "/saJ//7Hi//+yY3//suO//3NkP/9z5L//dGT//3Slf/91Jf//daY//3Ymv/92pz//dyd//3dn//936H/"
            + "/eGj//zjpf/85ab//Oao//zoqv/86qz//Oyu//zusP/88LH//PGz//zztf/89bf/+/e5//v5u//7+r3/"
            + "+/y//w==",
    plasma:
        "DAeG/xAHh/8TBon/FQaK/xgGi/8bBoz/HQaN/x8Fjv8hBY//IwWQ/yUFkf8nBZL/KQWT/ysFlP8tBJT/"
            + "LwSV/zEElv8zBJf/NASY/zYEmP84BJn/OgSa/zsDmv89A5v/PwOc/0ADnP9CA53/RAOe/0UDnv9HAp//"
            + "SQKf/0oCoP9MAqH/TgKh/08Cov9RAaL/UgGj/1QBo/9WAaP/VwGk/1kBpP9aAKX/XACl/14Apf9fAKb/"
            + "YQCm/2IApv9kAKf/ZQCn/2cAp/9oAKf/agCn/2wAqP9tAKj/bwCo/3AAqP9yAKj/cwCo/3UAqP92Aaj/"
            + "eAGo/3kBqP97Aqj/fAKn/34Dp/9/A6f/gQSn/4IEp/+EBab/hQam/4YHpv+IB6X/iQil/4sJpP+MCqT/"
            + "jgyk/48No/+QDqP/kg+i/5MQof+VEaH/lhKg/5cToP+ZFJ//mhWe/5sXnv+dGJ3/nhmc/58am/+gG5v/"
            + "ohya/6Mdmf+kHpj/pR+X/6chl/+oIpb/qSOV/6oklP+sJZP/rSaS/64nkf+vKJD/sCqP/7Erj/+yLI7/"
            + "tC2N/7UujP+2L4v/tzCK/7gyif+5M4j/ujSH/7s1hv+8NoX/vTeE/744g/+/OYL/wDuB/8E8gP/CPYD/"
            + "wz5//8Q/fv/FQH3/xkF8/8dCe//IRHr/yUV5/8pGeP/LR3f/zEh2/81Jdf/OSnX/z0t0/9BNc//RTnL/"
            + "0U9x/9JQcP/TUW//1FJu/9VTbf/WVW3/11Zs/9dXa//YWGr/2Vlp/9paaP/bW2f/3F1m/9xeZv/dX2X/"
            + "3mBk/99hY//fYmL/4GRh/+FlYP/iZmD/42df/+NoXv/kal3/5Wtc/+VsW//mbVr/525a/+hwWf/ocVj/"
            + "6XJX/+pzVv/qdFX/63ZU/+x3VP/seFP/7XlS/+17Uf/ufFD/731P/+9+Tv/wgE3/8IFN//GCTP/yhEv/"
            + "8oVK//OGSf/zh0j/9IlH//SKR//1i0b/9Y1F//aORP/2j0P/9pFC//eSQf/3k0H/+JVA//iWP//4mD7/"
            + "+Zk9//maPP/6nDv/+p06//qfOv/6oDn/+6I4//ujN//7pDb//KY1//ynNf/8qTT//Koz//ysMv/8rTH/"
            + "/a8x//2wMP/9si///bMu//21Lf/9ti3//bgs//25K//9uyv//bwq//2+Kf/9wCn//cEo//3DKP/9xCf/"
            + "/cYm//zHJv/8ySb//Msl//zMJf/8ziX/+9Ak//vRJP/70yT/+tUk//rWJP/62CT/+dkk//nbJP/43ST/"
            + "+N8k//fgJP/34iX/9uQl//blJf/15yb/9ekm//TqJv/z7Cb/8+4m//LwJv/y8Sb/8fMm//D1Jf/w9iP/"
            + "7/gh/w==",
    inferno:
        "AAAD/wAABP8AAAb/AQAH/wEBCf8BAQv/AgEO/wICEP8DAhL/BAMU/wQDFv8FBBj/BgQb/wcFHf8IBh//"
            + "CQYh/woHI/8LByb/DQgo/w4IKv8PCS3/EAkv/xIKMv8TCjT/FAs2/xYLOf8XCzv/GQs+/xoLQP8cDEP/"
            + "HQxF/x8MR/8gDEr/IgtM/yQLTv8mC1D/JwtS/ykLVP8rClb/LQpY/y4KWv8wClz/Mgld/zQJX/81CWD/"
            + "Nwlh/zkJYv87CWT/PAll/z4JZv9ACWb/QQln/0MKaP9FCmn/Rgpp/0gLav9KC2r/Swxr/00Ma/9PDWz/"
            + "UA1s/1IObP9TDm3/VQ9t/1cPbf9YEG3/WhFt/1sRbv9dEm7/XxJu/2ATbv9iFG7/YxRu/2UVbv9mFW7/"
            + "aBZu/2oXbv9rF27/bRhu/24Ybv9wGW7/chlt/3Mabf91G23/dhtt/3gcbf96HG3/ex1s/30dbP9+Hmz/"
            + "gB9r/4Efa/+DIGv/hSBq/4Yhav+IIWr/iSJp/4siaf+NI2n/jiRo/5AkaP+RJWf/kyVn/5UmZv+WJmb/"
            + "mCdl/5koZP+bKGT/nClj/54pY/+gKmL/oSth/6MrYf+kLGD/pixf/6ctX/+pLl7/qy5d/6wvXP+uMFv/"
            + "rzFb/7ExWv+yMln/tDNY/7UzV/+3NFb/uDVW/7o2Vf+7N1T/vTdT/744Uv+/OVH/wTpQ/8I7T//EPE7/"
            + "xT1N/8c+TP/IPkv/yT9K/8tASf/MQUj/zUJH/89ERv/QRUT/0UZD/9JHQv/USEH/1UlA/9ZKP//XSz7/"
            + "2U09/9pOO//bTzr/3FA5/91SOP/eUzf/31Q2/+BWNP/iVzP/41gy/+RaMf/lWzD/5lwu/+ZeLf/nXyz/"
            + "6GEr/+liKv/qZCj/62Un/+xnJv/taCX/7Woj/+5sIv/vbSH/8G8f//BwHv/xch3/8nQc//J1Gv/zdxn/"
            + "83kY//R6Fv/1fBX/9X4U//aAEv/2gRH/94MQ//eFDv/4hw3/+IgM//iKC//5jAn/+Y4I//mQCP/6kQf/"
            + "+pMG//qVBv/6lwb/+5kG//ubBv/7nQb/+54H//ugB//7ogj/+6QK//umC//7qA3/+6oO//usEP/7rhL/"
            + "+7AU//uxFv/7sxj/+7Ua//u3HP/7uR7/+rsh//q9I//6vyX/+sEo//nDKv/5xSz/+ccv//jJMf/4yzT/"
            + "+M03//fPOv/30Tz/9tM///bVQv/110X/9dlI//TbS//03E//895S//PgVv/z4ln/8uRd//LmYP/x6GT/"
            + "8elo//HrbP/x7XD/8e50//Hwef/x8n3/8vOB//L0hf/z9on/9PeN//X4kf/2+pX/9/uZ//n8nf/6/aD/"
            + "/P6k/w==",
    cividis:
        "ACJO/wAjT/8AJFH/ACVT/wAlVP8AJlb/ACdY/wAoWf8AKFv/ACld/wAqX/8AKmH/ACti/wAsZP8ALGb/"
            + "AC1o/wAuav8ALmz/AC9t/wAwb/8AMHD/ADFw/wAxcf8BMnH/BTNx/wgzcP8MNHD/DzVw/xI1cP8UNnD/"
            + "Fjdw/xg3b/8aOG//HDlv/x46b/8gOm//ITtu/yM8bv8kPG7/Jj1u/yc+bv8pP27/Kj9t/ytAbf8tQW3/"
            + "LkFt/y9Cbf8xQ23/MkNt/zNEbf80RWz/NUVs/zZGbP84R2z/OUhs/zpIbP87SWz/PEps/z1KbP8+S2z/"
            + "P0xs/0BMbP9BTWz/Qk5s/0NObP9ET2z/RVBs/0ZRbP9HUWz/SFJs/0lTbP9KU2z/S1Rs/0xVbP9NVWz/"
            + "TlZs/09XbP9QV2z/UVht/1JZbf9TWm3/VFpt/1Vbbf9VXG3/Vlxt/1ddbf9YXm3/WV5u/1pfbv9bYG7/"
            + "XGFu/11hbv9eYm7/XmNv/19jb/9gZG//YWVv/2Jlb/9jZnD/ZGdw/2VocP9laHD/Zmlw/2dqcf9oanH/"
            + "aWtx/2pscf9rbXL/bG1y/2xucv9tb3L/bm9z/29wc/9wcXP/cXJ0/3JydP9yc3T/c3R1/3R0df91dXX/"
            + "dnZ2/3d3dv93d3f/eHh3/3l5d/96enj/e3p4/3x7eP99fHj/fnx4/359eP9/fnj/gH94/4F/eP+CgHn/"
            + "g4F5/4SCef+Fgnn/hoN5/4eEeP+IhXj/iYV4/4qGeP+Lh3j/jIh4/42IeP+OiXj/j4p4/5CLeP+Ri3j/"
            + "kox4/5KNeP+Tjnj/lI53/5WPd/+WkHf/l5F3/5iSd/+Zknf/mpN2/5uUdv+clXb/nZV2/56Wdv+fl3X/"
            + "oJh1/6GZdf+imXX/o5p0/6SbdP+lnHT/ppx0/6edc/+onnP/qZ9z/6qgc/+roHL/rKFy/62icv+uo3H/"
            + "r6Rx/7Clcf+xpXD/s6Zw/7Snb/+1qG//tqlv/7epbv+4qm7/uatt/7qsbf+7rW3/vK5s/72ubP++r2v/"
            + "v7Br/8Cxav/Bsmr/wrNp/8Ozaf/EtGj/xbVo/8a2Z//Ht2f/yLhm/8m5Zf/LuWX/zLpk/827Y//OvGP/"
            + "z71i/9C+Yv/Rv2H/0sBg/9PAX//UwV//1cJe/9bDXf/XxFz/2cVc/9rGW//bx1r/3MhZ/93IWP/eyVj/"
            + "38pX/+DLVv/hzFX/4s1U/+TOU//lz1L/5tBR/+fRUP/o0k//6dNO/+rTTP/r1Ev/7dVK/+7WSf/v10j/"
            + "8NhG//HZRf/y2kT/89tC//XcQf/23T//994+//jfPP/54Dr/++E4//ziNv/94zT//uQ0//7lNf/+5jb/"
            + "/ug4/w==",
    coolwarm:
        "O0zA/zxOwv89UMP/PlHF/z9Txv9AVcj/QlfJ/0NYy/9EWsz/RVzO/0Zez/9IX9H/SWHS/0pj0/9LZNX/"
            + "TGbW/05o2P9Padn/UGva/1Ft2/9Tbt3/VHDe/1Vy3/9Wc+D/WHXh/1l34/9aeOT/W3rl/1185v9efef/"
            + "X3/o/2GA6f9igur/Y4Tr/2SF7P9mh+3/Z4ju/2iK7/9qi+//a43w/2yP8f9ukPL/b5Lz/3CT8/9ylfT/"
            + "c5b1/3WX9v92mfb/d5r3/3mc+P96nfj/e5/5/32g+f9+ofr/gKP6/4Gk+/+Cpvv/hKf8/4Wo/P+Gqfz/"
            + "iKv9/4ms/f+Lrf3/jK/+/42w/v+Psf7/kLL+/5K0/v+Ttf7/lLb//5a3//+XuP//mLn//5q7//+bvP//"
            + "nb3//56+//+fv///ocD//6LB//+jwv7/pcP+/6bE/v+nxf7/qcb9/6rH/f+ryP3/rcn9/67J/P+vyvz/"
            + "scv8/7LM+/+zzfv/tc36/7bO+v+3z/n/udD5/7rQ+P+70fj/vNL3/77S9v+/0/b/wNT1/8HU9P/D1fT/"
            + "xNXz/8XW8v/G1vH/x9fw/8nX8P/K2O//y9ju/8zZ7f/N2ez/ztrr/8/a6v/R2un/0tvo/9Pb5//U2+b/"
            + "1dvl/9bc5P/X3OP/2Nzi/9nc4f/a3OD/29ze/9zd3f/d3Nz/3tzb/9/b2f/g29j/4drW/+La1f/j2dP/"
            + "5NnS/+XY0f/m18//59fO/+jWzP/p1cv/6tXJ/+rUyP/r08b/7NPF/+3Sw//t0cL/7tDA/+/Pv//vzr3/"
            + "8M27//HNuv/xzLj/8su3//LKtf/yybT/88iy//PHsf/0xq//9MWt//XErP/1wqr/9cGp//XAp//2v6b/"
            + "9r6k//a9ov/3vKH/97qf//e5nv/3uJz/97eb//e1mf/3tJf/97OW//exlP/3sJP/96+R//etkP/3rI7/"
            + "96qM//epi//3qIn/96aI//alhv/2o4X/9qKD//Wggf/1n4D/9Z1+//Wcff/0mnv/9Jh6//OXeP/zlXf/"
            + "85R1//KSdP/ykHL/8Y9x//GNb//wi27/8Ips/++Ia//uhmn/7oRo/+2DZv/sgWX/7H9j/+t9Yv/qe2D/"
            + "6Xpf/+l4Xf/odlz/53Rb/+ZyWf/lcFj/5G5W/+NsVf/ja1T/4mlS/+FnUf/gZU//32NO/95hTf/dX0v/"
            + "3F1K/9paSf/ZWEf/2FZG/9dURf/WUkT/1VBC/9ROQf/SS0D/0Uk//9BHPf/PRTz/zUI7/8xAOv/LPjj/"
            + "yjs3/8g4Nv/HNjX/xTM0/8QwMv/DLjH/wSsw/8AoL/++JC7/vR8t/7sbLP+6Fiv/uBIq/7cNKP+1CSf/"
            + "tAQm/w==",
    twilight:
        "4tni/+HZ4v/g2eL/3tnh/93Z4P/c2d//2tjf/9jY3v/W193/1Nbc/9LV2//Q1Nn/zdPY/8vS1//I0Nb/"
            + "xc/V/8LO1P+/zNP/vMvR/7nJ0P+2yM//s8bO/7DFzf+tw83/qsLM/6fAy/+kvsr/ob3J/567yf+cucj/"
            + "mbjI/5a2x/+TtMb/krPG/46xxf+Mr8X/ia3F/4isxP+FqcT/gqfD/4Clw/9/pcP/fKLC/3qgwv94nsL/"
            + "d53C/3Wawf9zmMH/cZbB/3GVwP9uksD/bZDA/2yOv/9rjb//aYq//2iIvv9nhr7/Z4W+/2aCvf9lf73/"
            + "ZH28/2R8vP9jebv/Yne7/2J1uv9hcrr/YXG5/2BuuP9gbLj/YGm3/2Bntv9fZbX/X2K0/19gtP9fX7P/"
            + "X1uy/19Zsf9fV7D/XlSu/15Srf9eT6z/Xk2r/15Mqv9eSKj/Xkam/15Dpf9dQaP/XT6h/108oP9dOp7/"
            + "XDid/1w1mv9bMpj/WzCV/1ouk/9aK5D/WSmO/1gni/9YJor/VyOF/1Yhgv9VH3//Ux58/1Icef9RGnX/"
            + "Txly/08ZcP9MF2v/SxZo/0kVZP9HFGH/RhRe/0QTWv9CElf/QRJW/z8SUf89EU7/PBFL/zoRSf85EUb/"
            + "NxFE/zYRQv82EUH/NBE+/zMRPP8yEjr/MRM5/zAUN/8wFDf/MRM3/zMSN/80Ejj/NBI4/zYROf84ETn/"
            + "OhE6/zsRO/89ETz/PxI9/0ESPf9DEj7/RhJA/0gTQf9KE0L/TRRD/08URP9SFUX/VBVG/1YVRv9ZFkj/"
            + "XBdJ/18XSv9hGEv/ZBlL/2cZTP9pGk3/bBtO/28cTv9xHU//dB5P/3YfT/95IFD/eyFQ/34iUP9/I1D/"
            + "gyVQ/4UmUP+HJ1D/iilQ/4wqUP+OLFD/kC5Q/5IvUP+UMVD/ljNQ/5g1UP+aN1D/nDlQ/547UP+gPVD/"
            + "oD5Q/6NBUP+lQ1D/pkVQ/6hHUP+pSVD/q0tQ/6xNUf+uUFH/r1JR/7FUUv+yVlL/s1lT/7VbU/+2XVT/"
            + "t19V/7hhVf+5ZFb/umZX/7tpWP+8a1n/vW5a/75wW/+/cl3/wHVe/8F3X//CemH/wnxj/8N/ZP/EgWb/"
            + "xYRo/8WGav/Gh2v/xotu/8eOcf/IkHP/yJJ1/8mVeP/Jl3v/ypp9/8qcgP/Ln4P/zKGG/8yjif/Npoz/"
            + "zaiP/86rkv/PrZb/z66X/9CynP/RtKD/0baj/9K4p//Tuqr/1L2t/9W/sf/WwbT/18O4/9jFu//Yx77/"
            + "2cnC/9rLxf/bzMj/3M7L/9zPzf/d0dH/3tPT/9/U1v/f1dj/4Nba/+DX2//h2N3/4djf/+LZ4P/i2eH/"
            + "4tni/w=="
};

const BUILTIN_PALETTE_HEX: Record<BuiltinPaletteName, ReadonlyArray<string>> = {
    tab10: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"],
    okabeito: ["#000000", "#e69f00", "#56b4e9", "#009e73", "#f0e442", "#0072b2", "#d55e00", "#cc79a7"],
    chartjs: ["#36a2eb", "#ff6384", "#ff9f40", "#ffcd56", "#4bc0c0", "#9966ff", "#c9cbcf"]
};

const srgbToLinearChannel = (c: number): number => { if (c <= 0.04045) return c / 12.92; return Math.pow((c + 0.055) / 1.055, 2.4); };

const linearToSrgbChannel = (c: number): number => { if (c <= 0.0031308) return c * 12.92; return (1.055 * Math.pow(c, 1 / 2.4)) - 0.055; };

const SRGB_BYTE_TO_LINEAR = (() => { const out = new Float64Array(256); for (let i = 0; i < 256; i++) out[i] = srgbToLinearChannel(i / 255); return out; })();

const toByte = (x: number): number => Math.max(0, Math.min(255, Math.round(clamp01(x) * 255)));

const isColor4 = (c: unknown): c is Color4 => Array.isArray(c) && c.length === 4 && c.every((x) => typeof x === "number" && Number.isFinite(x));

const decodeBase64ToU8 = (b64: string): Uint8Array => {
    if (typeof (globalThis as any).atob === "function") {
        const bin = (globalThis as any).atob(b64) as string;
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
        return out;
    }
    const B = (globalThis as any).Buffer as any;
    if (B && typeof B.from === "function") return Uint8Array.from(B.from(b64, "base64"));
    throw new Error("Colormap: No base64 decoder available (expected atob() or Buffer).");
};

const createBuiltinLUT = (name: BuiltinColormapName): Uint8Array => {
    if (name === "grayscale") {
        const out = new Uint8Array(BUILTIN_RESOLUTION * 4);
        for (let i = 0; i < BUILTIN_RESOLUTION; i++) out.set([i, i, i, 255], i * 4);
        return out;
    }
    if (name === "hsv") {
        const out = new Uint8Array(BUILTIN_RESOLUTION * 4);
        for (let i = 0; i < BUILTIN_RESOLUTION; i++) {
            const h = (i / (BUILTIN_RESOLUTION - 1)) * 6;
            const channel = (n: number): number => {
                const k = (n + h) % 6;
                return 1 - Math.max(0, Math.min(k, 4 - k, 1));
            };
            out.set([toByte(channel(5)), toByte(channel(3)), toByte(channel(1)), 255], i * 4);
        }
        return out;
    }
    const decoded = decodeBase64ToU8(BUILTIN_RGBA8_BASE64[name]);
    assert(decoded.length === BUILTIN_RESOLUTION * 4, `Colormap.builtin: table '${name}' has an unexpected length.`);
    return decoded;
};

const parseColorSrgb = (css: string, label: string): Color4 => {
    const fail = (): never => { throw new Error(`${label}: unsupported color ${JSON.stringify(css)} (expected #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(r, g, b), or rgba(r, g, b, a) with integer channels 0-255 and alpha 0-1).`); };
    if (typeof css !== "string") return fail();
    const s = css.trim();
    const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
    if (hex) {
        const h = hex[1];
        const short = h.length <= 4;
        const n = short ? h.length : h.length / 2;
        const out: Color4 = [0, 0, 0, 1];
        for (let i = 0; i < n; i++) {
            const part = short ? h[i] + h[i] : h.slice(i * 2, i * 2 + 2);
            out[i] = parseInt(part, 16) / 255;
        }
        return out;
    }
    const fn = /^(rgba?)\(\s*([^)]*?)\s*\)$/i.exec(s);
    if (!fn) return fail();
    const isRgba = fn[1].toLowerCase() === "rgba";
    const args = fn[2].split(",").map((x) => x.trim());
    if (args.length !== (isRgba ? 4 : 3)) return fail();
    const out: Color4 = [0, 0, 0, 1];
    for (let i = 0; i < 3; i++) {
        if (!/^\d{1,3}$/.test(args[i])) return fail();
        const v = Number(args[i]);
        if (v > 255) return fail();
        out[i] = v / 255;
    }
    if (isRgba) {
        if (!/^[+]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(args[3])) return fail();
        const a = Number(args[3]);
        if (!Number.isFinite(a) || a < 0 || a > 1) return fail();
        out[3] = a;
    }
    return out;
};

const encodeLUT = (colors: ReadonlyArray<Color4>, colorSpace: ColormapColorSpace): Uint8Array => {
    const out = new Uint8Array(colors.length * 4);
    for (let i = 0; i < colors.length; i++) {
        const c = colors[i];
        for (let k = 0; k < 3; k++) {
            const v = clamp01(c[k]);
            out[i * 4 + k] = toByte(colorSpace === "linear" ? linearToSrgbChannel(v) : v);
        }
        out[i * 4 + 3] = toByte(c[3]);
    }
    return out;
};

const normalizeStops = (stops: ReadonlyArray<ColormapStop>): Array<{ t: number; color: Color4 }> => {
    assert(Array.isArray(stops) && stops.length >= 2, "Colormap.fromStops: expected at least 2 stops.");
    const out: Array<{ t: number; color: Color4 }> = [];
    let implicitIndex = 0;
    for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        if (Array.isArray(s)) {
            assert(isColor4(s), `Colormap.fromStops: stop ${i} must be a length-4 array of finite numbers.`);
            out.push({ t: implicitIndex / (stops.length - 1), color: [s[0], s[1], s[2], s[3]] });
            implicitIndex++;
        } else {
            assert(s !== null && typeof s === "object", `Colormap.fromStops: stop ${i} must be a color or { t, color }.`);
            assert(typeof s.t === "number" && Number.isFinite(s.t), `Colormap.fromStops: stop ${i} has a non-finite t.`);
            assert(isColor4(s.color), `Colormap.fromStops: stop ${i} color must be a length-4 array of finite numbers.`);
            out.push({ t: s.t, color: [s.color[0], s.color[1], s.color[2], s.color[3]] });
        }
    }
    out.sort((a, b) => a.t - b.t);
    for (const s of out) s.t = clamp01(s.t);
    if (out[0].t > 0) out.unshift({ t: 0, color: out[0].color });
    const last = out.length - 1;
    if (out[last].t < 1) out.push({ t: 1, color: out[last].color });
    return out;
};

const sampleStopsLinear = (stops: ReadonlyArray<{ t: number; color: Color4 }>, t: number): Color4 => {
    const x = clamp01(t);
    if (x <= stops[0].t) return stops[0].color;
    const last = stops.length - 1;
    if (x >= stops[last].t) return stops[last].color;
    for (let i = 0; i < last; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        if (x >= a.t && x <= b.t) {
            const denom = (b.t - a.t) || 1e-6;
            const u = (x - a.t) / denom;
            return [lerp(a.color[0], b.color[0], u), lerp(a.color[1], b.color[1], u), lerp(a.color[2], b.color[2], u), lerp(a.color[3], b.color[3], u)];
        }
    }
    return stops[last].color;
};

const createTexture1DFromRGBA8 = (device: GPUDevice, queue: GPUQueue, rgba8: Uint8Array, width: number, label: string): GPUTexture => {
    assert(width > 0, "Colormap: width must be > 0.");
    assert((rgba8.length >>> 0) === (width * 4), "Colormap: rgba8 length must be width*4.");
    const texture = device.createTexture({
        label,
        size: { width, height: 1, depthOrArrayLayers: 1 },
        dimension: "1d",
        format: "rgba8unorm-srgb",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    queue.writeTexture({ texture }, new Uint8Array(rgba8), { bytesPerRow: width * 4, rowsPerImage: 1 }, { width, height: 1, depthOrArrayLayers: 1 });
    return texture;
};

const createSampler = (device: GPUDevice, filter: ColormapFilter): GPUSampler => device.createSampler({
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    addressModeW: "clamp-to-edge",
    magFilter: filter === "linear" ? "linear" : "nearest",
    minFilter: filter === "linear" ? "linear" : "nearest",
    mipmapFilter: "nearest"
});

const BUILTIN_CACHE: Map<BuiltinColormapName, Colormap> = new Map();
const PALETTE_CACHE: Map<BuiltinPaletteName, Colormap> = new Map();
const PALETTE_LINEAR_CACHE: Map<BuiltinPaletteName, ReadonlyArray<Color4>> = new Map();

let _nextColormapId = 1;

export class Colormap {
    readonly id: number = _nextColormapId++;
    private readonly _label: string;
    private readonly _filter: ColormapFilter;
    private readonly _width: number;
    private readonly _lut: Uint8Array | null;
    private readonly _external: { device: GPUDevice; view: GPUTextureView; sampler: GPUSampler; width: number; filter: ColormapFilter; } | null;
    private _gpuByDevice: WeakMap<GPUDevice, ColormapGPUResources> = new WeakMap();
    private _reversed: Colormap | null = null;

    constructor(opts: { label: string; width: number; filter: ColormapFilter; lut?: Uint8Array | null; external?: Colormap["_external"]; }) {
        this._label = opts.label;
        this._width = opts.width;
        this._filter = opts.filter;
        this._lut = opts.lut ?? null;
        this._external = opts.external ?? null;
        assert(Number.isInteger(this._width) && this._width > 0, "Colormap: width must be a positive integer.");
        assert(this._lut === null || this._lut.length === this._width * 4, "Colormap: lut length must be width*4.");
    }

    static builtin(name: BuiltinColormapName): Colormap {
        const cached = BUILTIN_CACHE.get(name);
        if (cached) return cached;
        assert(BUILTIN_COLORMAP_NAMES.includes(name), () => `Colormap.builtin: unknown colormap ${JSON.stringify(name)} (expected one of ${BUILTIN_COLORMAP_NAMES.join(", ")}).`);
        const colormap = new Colormap({ label: `Colormap.${name}`, width: BUILTIN_RESOLUTION, filter: "linear", lut: createBuiltinLUT(name) });
        BUILTIN_CACHE.set(name, colormap);
        return colormap;
    }

    static palette(name: BuiltinPaletteName): Colormap {
        const cached = PALETTE_CACHE.get(name);
        if (cached) return cached;
        assert(BUILTIN_PALETTE_NAMES.includes(name), () => `Colormap.palette: unknown palette ${JSON.stringify(name)} (expected one of ${BUILTIN_PALETTE_NAMES.join(", ")}).`);
        const colors = BUILTIN_PALETTE_HEX[name].map((hex) => parseColorSrgb(hex, "Colormap.palette"));
        const colormap = new Colormap({ label: `Colormap.${name}`, width: colors.length, filter: "nearest", lut: encodeLUT(colors, "srgb") });
        PALETTE_CACHE.set(name, colormap);
        return colormap;
    }

    static fromStops(stops: ReadonlyArray<ColormapStop>, desc: ColormapDescriptor = {}): Colormap {
        const resolution = desc.resolution ?? BUILTIN_RESOLUTION;
        assert(Number.isInteger(resolution) && resolution >= 2 && resolution <= MAX_RESOLUTION, `Colormap.fromStops: resolution must be an integer in [2, ${MAX_RESOLUTION}].`);
        const filter = desc.filter ?? "linear";
        const colorSpace = desc.colorSpace ?? "srgb";
        const interpolation = desc.interpolation ?? "srgb";
        assert(filter === "linear" || filter === "nearest", "Colormap.fromStops: filter must be 'linear' or 'nearest'.");
        assert(colorSpace === "srgb" || colorSpace === "linear", "Colormap.fromStops: colorSpace must be 'srgb' or 'linear'.");
        assert(interpolation === "srgb" || interpolation === "linear" || interpolation === "oklab", "Colormap.fromStops: interpolation must be 'srgb', 'linear', or 'oklab'.");
        const normalized = normalizeStops(stops);
        for (const s of normalized) {
            const c: Color4 = [clamp01(s.color[0]), clamp01(s.color[1]), clamp01(s.color[2]), clamp01(s.color[3])];
            if (interpolation === "srgb") s.color = colorSpace === "srgb" ? c : linearToSrgb(c);
            else {
                const linear = colorSpace === "linear" ? c : srgbToLinear(c);
                s.color = interpolation === "linear" ? linear : toOklab(linear);
            }
        }
        const samples: Color4[] = new Array(resolution);
        for (let i = 0; i < resolution; i++) {
            const c = sampleStopsLinear(normalized, i / (resolution - 1));
            if (interpolation === "srgb") samples[i] = c;
            else samples[i] = linearToSrgb(interpolation === "linear" ? c : fromOklab(c));
        }
        return new Colormap({ label: "Colormap.customStops", width: resolution, filter, lut: encodeLUT(samples, "srgb") });
    }

    static fromPalette(colors: ReadonlyArray<Color4>, desc: ColormapDescriptor = {}): Colormap {
        assert(Array.isArray(colors) && colors.length >= 1, "Colormap.fromPalette: expected at least 1 color.");
        assert(colors.length <= MAX_RESOLUTION, `Colormap.fromPalette: expected at most ${MAX_RESOLUTION} colors.`);
        for (let i = 0; i < colors.length; i++) assert(isColor4(colors[i]), `Colormap.fromPalette: color ${i} must be a length-4 array of finite numbers.`);
        const filter = desc.filter ?? "nearest";
        const colorSpace = desc.colorSpace ?? "srgb";
        assert(filter === "linear" || filter === "nearest", "Colormap.fromPalette: filter must be 'linear' or 'nearest'.");
        assert(colorSpace === "srgb" || colorSpace === "linear", "Colormap.fromPalette: colorSpace must be 'srgb' or 'linear'.");
        return new Colormap({ label: "Colormap.palette", width: colors.length, filter, lut: encodeLUT(colors, colorSpace) });
    }

    static fromGPUTextureView(device: GPUDevice, view: GPUTextureView, sampler: GPUSampler, width: number, filter: ColormapFilter = "linear"): Colormap {
        assert(width > 0, "Colormap.fromGPUTextureView: width must be > 0.");
        return new Colormap({ label: "Colormap.external", width, filter, external: { device, view, sampler, width, filter } });
    }

    get width(): number {
        return this._width;
    }

    get filter(): ColormapFilter {
        return this._filter;
    }

    get canSampleCPU(): boolean {
        return this._lut !== null;
    }

    getLUT(colorSpace: ColormapColorSpace = "srgb"): Uint8Array {
        const lut = this._lut;
        if (!lut) throw new Error("Colormap: CPU sampling is unavailable for external GPU-only colormaps.");
        if (colorSpace === "srgb") return lut.slice();
        const out = new Uint8Array(lut.length);
        for (let i = 0; i < lut.length; i += 4) {
            out[i + 0] = Math.round(SRGB_BYTE_TO_LINEAR[lut[i + 0]] * 255);
            out[i + 1] = Math.round(SRGB_BYTE_TO_LINEAR[lut[i + 1]] * 255);
            out[i + 2] = Math.round(SRGB_BYTE_TO_LINEAR[lut[i + 2]] * 255);
            out[i + 3] = lut[i + 3];
        }
        return out;
    }

    sampleCPU(t: number, colorSpace: ColormapColorSpace = "linear"): Color4 {
        const lut = this._lut;
        if (!lut) throw new Error("Colormap: CPU sampling is unavailable for external GPU-only colormaps.");
        const w = this._width;
        const u = Number.isNaN(t) ? 0 : clamp01(t);
        let out: Color4;
        if (this._filter === "nearest") {
            const o = Math.min(w - 1, Math.floor(u * w)) * 4;
            out = [SRGB_BYTE_TO_LINEAR[lut[o + 0]], SRGB_BYTE_TO_LINEAR[lut[o + 1]], SRGB_BYTE_TO_LINEAR[lut[o + 2]], lut[o + 3] / 255];
        } else {
            const x = clamp((u * w) - 0.5, 0, w - 1);
            const i0 = Math.floor(x);
            const i1 = Math.min(i0 + 1, w - 1);
            const f = x - i0;
            const o0 = i0 * 4;
            const o1 = i1 * 4;
            out = [
                lerp(SRGB_BYTE_TO_LINEAR[lut[o0 + 0]], SRGB_BYTE_TO_LINEAR[lut[o1 + 0]], f),
                lerp(SRGB_BYTE_TO_LINEAR[lut[o0 + 1]], SRGB_BYTE_TO_LINEAR[lut[o1 + 1]], f),
                lerp(SRGB_BYTE_TO_LINEAR[lut[o0 + 2]], SRGB_BYTE_TO_LINEAR[lut[o1 + 2]], f),
                lerp(lut[o0 + 3] / 255, lut[o1 + 3] / 255, f)
            ];
        }
        return colorSpace === "srgb" ? linearToSrgb(out) : out;
    }

    reversed(): Colormap {
        if (this._reversed) return this._reversed;
        const lut = this._lut;
        if (!lut) throw new Error("Colormap.reversed: unavailable for external GPU-only colormaps.");
        const w = this._width;
        const out = new Uint8Array(lut.length);
        for (let i = 0; i < w; i++) out.set(lut.subarray((w - 1 - i) * 4, (w - i) * 4), i * 4);
        const reversed = new Colormap({ label: `${this._label}.reversed`, width: w, filter: this._filter, lut: out });
        reversed._reversed = this;
        this._reversed = reversed;
        return reversed;
    }

    getGPUResources(device: GPUDevice, queue: GPUQueue): ColormapGPUResources {
        if (this._external) {
            assert(this._external.device === device, "Colormap: external texture was created with a different GPUDevice.");
            return { texture: null, view: this._external.view, sampler: this._external.sampler, width: this._external.width, filter: this._external.filter };
        }
        const cached = this._gpuByDevice.get(device);
        if (cached) return cached;
        const lut = this._lut ?? (() => { throw new Error("Colormap: no LUT data to upload."); })();
        const texture = createTexture1DFromRGBA8(device, queue, lut, this._width, this._label);
        const view = texture.createView({ dimension: "1d" });
        const sampler = createSampler(device, this._filter);
        const res: ColormapGPUResources = { texture, view, sampler, width: this._width, filter: this._filter };
        this._gpuByDevice.set(device, res);
        return res;
    }
}

export const srgbToLinear = (color: Color4): Color4 => [srgbToLinearChannel(color[0]), srgbToLinearChannel(color[1]), srgbToLinearChannel(color[2]), color[3]];

export const linearToSrgb = (color: Color4): Color4 => [linearToSrgbChannel(color[0]), linearToSrgbChannel(color[1]), linearToSrgbChannel(color[2]), color[3]];

export const parseColor = (css: string): Color4 => srgbToLinear(parseColorSrgb(css, "parseColor"));

export const toOklab = (color: Color4): [number, number, number, number] => {
    const [r, g, b, a] = color;
    const l = Math.cbrt((0.4122214708 * r) + (0.5363325363 * g) + (0.0514459929 * b));
    const m = Math.cbrt((0.2119034982 * r) + (0.6806995451 * g) + (0.1073969566 * b));
    const s = Math.cbrt((0.0883024619 * r) + (0.2817188376 * g) + (0.6299787005 * b));
    return [
        (0.2104542553 * l) + (0.7936177850 * m) - (0.0040720468 * s),
        (1.9779984951 * l) - (2.4285922050 * m) + (0.4505937099 * s),
        (0.0259040371 * l) + (0.7827717662 * m) - (0.8086757660 * s),
        a
    ];
};

export const fromOklab = (lab: readonly [number, number, number, number]): Color4 => {
    const [L, A, B, alpha] = lab;
    const l = L + (0.3963377774 * A) + (0.2158037573 * B);
    const m = L - (0.1055613458 * A) - (0.0638541728 * B);
    const s = L - (0.0894841775 * A) - (1.2914855480 * B);
    const l3 = l * l * l;
    const m3 = m * m * m;
    const s3 = s * s * s;
    return [
        (4.0767416621 * l3) - (3.3077115913 * m3) + (0.2309699292 * s3),
        (-1.2684380046 * l3) + (2.6097574011 * m3) - (0.3413193965 * s3),
        (-0.0041960863 * l3) - (0.7034186147 * m3) + (1.7076147010 * s3),
        alpha
    ];
};

export const paletteSwatch = (palette: BuiltinPaletteName | ReadonlyArray<Color4>, index: number, alpha: number = 1): Color4 => {
    assert(Number.isInteger(index), "paletteSwatch: index must be an integer.");
    assert(typeof alpha === "number" && alpha >= 0 && alpha <= 1, "paletteSwatch: alpha must be in [0, 1].");
    let colors: ReadonlyArray<Color4>;
    if (typeof palette === "string") {
        const cached = PALETTE_LINEAR_CACHE.get(palette);
        if (cached) colors = cached;
        else {
            assert(BUILTIN_PALETTE_NAMES.includes(palette), () => `paletteSwatch: unknown palette ${JSON.stringify(palette)} (expected one of ${BUILTIN_PALETTE_NAMES.join(", ")}).`);
            colors = BUILTIN_PALETTE_HEX[palette].map((hex) => srgbToLinear(parseColorSrgb(hex, "paletteSwatch")));
            PALETTE_LINEAR_CACHE.set(palette, colors);
        }
    } else {
        assert(Array.isArray(palette) && palette.length >= 1, "paletteSwatch: expected a palette name or a non-empty array of colors.");
        colors = palette;
    }
    const n = colors.length;
    const c = colors[((index % n) + n) % n];
    assert(isColor4(c), "paletteSwatch: palette colors must be length-4 arrays of finite numbers.");
    return [c[0], c[1], c[2], c[3] * alpha];
};

export const domainColor = (re: number, im: number, desc: DomainColorDescriptor = {}): Color4 => {
    const mode = desc.mode ?? "domain";
    assert(mode === "domain" || mode === "argument" || mode === "modulus", "domainColor: mode must be 'domain', 'argument', or 'modulus'.");
    const source = desc.colormap ?? (mode === "modulus" ? "viridis" : "hsv");
    const colormap = typeof source === "string" ? Colormap.builtin(source) : source;
    assert(colormap instanceof Colormap, "domainColor: colormap must be a built-in colormap name or a Colormap.");
    if (!Number.isFinite(re) || !Number.isFinite(im)) return [1, 1, 1, 1];
    const modulus = Math.hypot(re, im);
    if (!Number.isFinite(modulus)) return [1, 1, 1, 1];
    if (mode === "modulus") {
        const range = desc.range ?? [0, 1];
        assert(Array.isArray(range) && range.length === 2 && Number.isFinite(range[0]) && Number.isFinite(range[1]), "domainColor: range must be two finite numbers.");
        const span = range[1] - range[0];
        return colormap.sampleCPU(span === 0 ? 0.5 : (modulus - range[0]) / span, "linear");
    }
    const turns = Math.atan2(im, re) / (2 * Math.PI);
    const t = ((turns % 1) + 1) % 1;
    if (mode === "argument") return colormap.sampleCPU(t, "linear");
    if (re === 0 && im === 0) return [0, 0, 0, 1];
    const c = colormap.sampleCPU(t, "srgb");
    const L = (2 / Math.PI) * Math.atan(modulus);
    const shade = (x: number): number => L < 0.5 ? x * 2 * L : x + ((1 - x) * ((2 * L) - 1));
    return srgbToLinear([shade(c[0]), shade(c[1]), shade(c[2]), c[3]]);
};

export const color = Object.freeze({
    map: Object.freeze({
        builtin: (name: BuiltinColormapName): Colormap => {
            return Colormap.builtin(name);
        },
        grayscale: (): Colormap => {
            return Colormap.builtin("grayscale");
        },
        turbo: (): Colormap => {
            return Colormap.builtin("turbo");
        },
        viridis: (): Colormap => {
            return Colormap.builtin("viridis");
        },
        magma: (): Colormap => {
            return Colormap.builtin("magma");
        },
        plasma: (): Colormap => {
            return Colormap.builtin("plasma");
        },
        inferno: (): Colormap => {
            return Colormap.builtin("inferno");
        },
        cividis: (): Colormap => {
            return Colormap.builtin("cividis");
        },
        coolwarm: (): Colormap => {
            return Colormap.builtin("coolwarm");
        },
        twilight: (): Colormap => {
            return Colormap.builtin("twilight");
        },
        hsv: (): Colormap => {
            return Colormap.builtin("hsv");
        },
        fromStops: (stops: ReadonlyArray<ColormapStop>, desc: ColormapDescriptor = {}): Colormap => {
            return Colormap.fromStops(stops, desc);
        },
        fromPalette: (colors: ReadonlyArray<[number, number, number, number]>, desc: ColormapDescriptor = {}): Colormap => {
            return Colormap.fromPalette(colors, desc);
        },
        fromGPUTextureView: (device: GPUDevice, view: GPUTextureView, sampler: GPUSampler, width: number, filter?: ColormapFilter): Colormap => {
            return Colormap.fromGPUTextureView(device, view, sampler, width, filter);
        }
    }),
    palette: Object.freeze({
        builtin: (name: BuiltinPaletteName): Colormap => {
            return Colormap.palette(name);
        },
        tab10: (): Colormap => {
            return Colormap.palette("tab10");
        },
        okabeito: (): Colormap => {
            return Colormap.palette("okabeito");
        },
        chartjs: (): Colormap => {
            return Colormap.palette("chartjs");
        },
        swatch: (palette: BuiltinPaletteName | ReadonlyArray<[number, number, number, number]>, index: number, alpha?: number): [number, number, number, number] => {
            return paletteSwatch(palette, index, alpha);
        }
    }),
    parse: parseColor,
    srgbToLinear: srgbToLinear,
    linearToSrgb: linearToSrgb,
    toOklab: toOklab,
    fromOklab: fromOklab,
    domain: (re: number, im: number, desc?: DomainColorDescriptor): [number, number, number, number] => {
        return domainColor(re, im, desc);
    }
});
