/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert, clamp01, lerp } from "../utils";
import type { Color4 } from "./material";

export type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno";

export type ColormapFilter = "linear" | "nearest";

export type ColormapStop = Color4 | { t: number; color: Color4; };

export type ColormapDescriptor = {
    resolution?: number;
    filter?: ColormapFilter;
    colorSpace?: "srgb" | "linear";
};

type ColormapGPUResources = {
    texture: GPUTexture | null;
    view: GPUTextureView;
    sampler: GPUSampler;
    width: number;
    filter: ColormapFilter;
};

const BUILTIN_RESOLUTION = 256;

const BUILTIN_RGBA8_BASE64: Record<BuiltinColormapName, string> = {
    grayscale:
        "AAAA/wEBAf8CAgL/AwMD/wQEBP8FBQX/BgYG/wcHB/8ICAj/CQkJ/woKCv8LCwv/DAwM/w0NDf8ODg7/"
            + "Dw8P/xAQEP8RERH/EhIS/xMTE/8UFBT/FRUV/xYWFv8XFxf/GBgY/xkZGf8aGhr/Gxsb/xwcHP8dHR3/"
            + "Hh4e/x8fH/8gICD/ICAg/yIiIv8jIyP/JCQk/yQkJP8mJib/Jycn/ygoKP8oKCj/Kioq/ysrK/8sLCz/"
            + "LCws/y4uLv8vLy//MDAw/zAwMP8yMjL/MzMz/zQ0NP80NDT/NjY2/zc3N/84ODj/ODg4/zo6Ov87Ozv/"
            + "PDw8/zw8PP8+Pj7/Pz8//0BAQP9BQUH/QUFB/0NDQ/9ERET/RUVF/0ZGRv9HR0f/SEhI/0lJSf9JSUn/"
            + "S0tL/0xMTP9NTU3/Tk5O/09PT/9QUFD/UVFR/1FRUf9TU1P/VFRU/1VVVf9WVlb/V1dX/1hYWP9ZWVn/"
            + "WVlZ/1tbW/9cXFz/XV1d/15eXv9fX1//YGBg/2FhYf9hYWH/Y2Nj/2RkZP9lZWX/ZmZm/2dnZ/9oaGj/"
            + "aWlp/2lpaf9ra2v/bGxs/21tbf9ubm7/b29v/3BwcP9xcXH/cXFx/3Nzc/90dHT/dXV1/3Z2dv93d3f/"
            + "eHh4/3l5ef95eXn/e3t7/3x8fP99fX3/fn5+/39/f/+AgID/gYGB/4KCgv+Dg4P/g4OD/4WFhf+Ghob/"
            + "h4eH/4iIiP+JiYn/ioqK/4uLi/+MjIz/jY2N/46Ojv+Pj4//kJCQ/5GRkf+SkpL/k5OT/5OTk/+VlZX/"
            + "lpaW/5eXl/+YmJj/mZmZ/5qamv+bm5v/nJyc/52dnf+enp7/n5+f/6CgoP+hoaH/oqKi/6Ojo/+jo6P/"
            + "paWl/6ampv+np6f/qKio/6mpqf+qqqr/q6ur/6ysrP+tra3/rq6u/6+vr/+wsLD/sbGx/7Kysv+zs7P/"
            + "s7Oz/7W1tf+2trb/t7e3/7i4uP+5ubn/urq6/7u7u/+8vLz/vb29/76+vv+/v7//wMDA/8HBwf/CwsL/"
            + "w8PD/8PDw//FxcX/xsbG/8fHx//IyMj/ycnJ/8rKyv/Ly8v/zMzM/83Nzf/Ozs7/z8/P/9DQ0P/R0dH/"
            + "0tLS/9PT0//T09P/1dXV/9bW1v/X19f/2NjY/9nZ2f/a2tr/29vb/9zc3P/d3d3/3t7e/9/f3//g4OD/"
            + "4eHh/+Li4v/j4+P/4+Pj/+Xl5f/m5ub/5+fn/+jo6P/p6en/6urq/+vr6//s7Oz/7e3t/+7u7v/v7+//"
            + "8PDw//Hx8f/y8vL/8/Pz//Pz8//19fX/9vb2//f39//4+Pj/+fn5//r6+v/7+/v//Pz8//39/f/+/v7/"
            + "/////w==",
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
            + "/P6k/w=="
};

const srgbToLinearChannel = (c: number): number => {
    if (c <= 0.04045) return c / 12.92;
    return Math.pow((c + 0.055) / 1.055, 2.4);
};

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

const ensureBuiltinRGBA8Linear = (name: BuiltinColormapName): Uint8Array => {
    const anyMap = BUILTIN_RGBA8_BASE64 as any;
    const cached = anyMap[name] as unknown;
    if (cached instanceof Uint8Array) return cached;
    const decoded = decodeBase64ToU8(BUILTIN_RGBA8_BASE64[name]);
    anyMap[name] = decoded;
    return decoded;
};

const normalizeStops = (stops: ReadonlyArray<ColormapStop>): Array<{ t: number; color: Color4 }> => {
    assert(stops.length >= 2, "Colormap: expected at least 2 stops.");
    const out: Array<{ t: number; color: Color4 }> = [];
    let implicitIndex = 0;
    for (const s of stops) {
        if (Array.isArray(s)) {
            out.push({ t: stops.length <= 1 ? 0 : implicitIndex / (stops.length - 1), color: [s[0], s[1], s[2], s[3]] });
            implicitIndex++;
        } else out.push({ t: s.t, color: [s.color[0], s.color[1], s.color[2], s.color[3]] });
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
            return [
                lerp(a.color[0], b.color[0], u),
                lerp(a.color[1], b.color[1], u),
                lerp(a.color[2], b.color[2], u),
                lerp(a.color[3], b.color[3], u)
            ];
        }
    }
    return stops[last].color;
};

const toRGBA8Linear = (colors: ReadonlyArray<Color4>, colorSpace: "srgb" | "linear"): Uint8Array => {
    const out = new Uint8Array(colors.length * 4);
    for (let i = 0; i < colors.length; i++) {
        let r = clamp01(colors[i][0]);
        let g = clamp01(colors[i][1]);
        let b = clamp01(colors[i][2]);
        const a = clamp01(colors[i][3]);
        if (colorSpace === "srgb") {
            r = srgbToLinearChannel(r);
            g = srgbToLinearChannel(g);
            b = srgbToLinearChannel(b);
        }
        out[i * 4 + 0] = Math.max(0, Math.min(255, Math.round(r * 255)));
        out[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
        out[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
        out[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
    }
    return out;
};

const sampleRGBA8Nearest = (rgba8: Uint8Array, width: number, t: number): Color4 => {
    const x = Math.min(width - 1, Math.max(0, Math.round(clamp01(t) * (width - 1))));
    return [
        rgba8[x * 4 + 0] / 255,
        rgba8[x * 4 + 1] / 255,
        rgba8[x * 4 + 2] / 255,
        rgba8[x * 4 + 3] / 255
    ];
};

const sampleRGBA8Linear = (rgba8: Uint8Array, width: number, t: number): Color4 => {
    const tx = clamp01(t) * Math.max(0, width - 1);
    const i0 = Math.min(width - 1, Math.max(0, Math.floor(tx)));
    const i1 = Math.min(width - 1, i0 + 1);
    const f = tx - i0;
    const o0 = i0 * 4;
    const o1 = i1 * 4;
    return [
        lerp(rgba8[o0 + 0] / 255, rgba8[o1 + 0] / 255, f),
        lerp(rgba8[o0 + 1] / 255, rgba8[o1 + 1] / 255, f),
        lerp(rgba8[o0 + 2] / 255, rgba8[o1 + 2] / 255, f),
        lerp(rgba8[o0 + 3] / 255, rgba8[o1 + 3] / 255, f)
    ];
};

const createTexture1DFromRGBA8 = (device: GPUDevice, queue: GPUQueue, rgba8: Uint8Array, width: number, label: string): GPUTexture => {
    assert(width > 0, "Colormap: width must be > 0.");
    assert((rgba8.length >>> 0) === (width * 4), "Colormap: rgba8 length must be width*4.");
    const texture = device.createTexture({
        label,
        size: { width, height: 1, depthOrArrayLayers: 1 },
        dimension: "1d",
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    const bytesPerRowUnaligned = width * 4;
    const bytesPerRow = alignTo(bytesPerRowUnaligned, 256);
    const data = bytesPerRow === bytesPerRowUnaligned ? rgba8 : (() => {
        const padded = new Uint8Array(bytesPerRow);
        padded.set(rgba8);
        return padded;
    })();
    queue.writeTexture(
        { texture },
        new Uint8Array(data),
        { bytesPerRow, rowsPerImage: 1 },
        { width, height: 1, depthOrArrayLayers: 1 }
    );
    return texture;
};

const createSampler = (device: GPUDevice, filter: ColormapFilter): GPUSampler => {
    return device.createSampler({
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        addressModeW: "clamp-to-edge",
        magFilter: filter === "linear" ? "linear" : "nearest",
        minFilter: filter === "linear" ? "linear" : "nearest",
        mipmapFilter: "nearest"
    });
};

let _nextColormapId = 1;

export class Colormap {
    readonly id: number = _nextColormapId++;
    private readonly _label: string;
    private readonly _filter: ColormapFilter;
    private readonly _width: number;
    private readonly _rgba8Linear: Uint8Array | null;
    private readonly _external: { device: GPUDevice; view: GPUTextureView; sampler: GPUSampler; width: number; filter: ColormapFilter; } | null;
    private _gpuByDevice: WeakMap<GPUDevice, ColormapGPUResources> = new WeakMap();

    constructor(opts: { label: string; width: number; filter: ColormapFilter; rgba8Linear?: Uint8Array | null; external?: Colormap["_external"]; }) {
        this._label = opts.label;
        this._width = opts.width;
        this._filter = opts.filter;
        this._rgba8Linear = opts.rgba8Linear ?? null;
        this._external = opts.external ?? null;
    }

    static builtin(name: BuiltinColormapName): Colormap {
        return BUILTIN_SINGLETONS[name];
    }

    static fromStops(stops: ReadonlyArray<ColormapStop>, desc: ColormapDescriptor = {}): Colormap {
        const resolution = Math.max(2, Math.floor(desc.resolution ?? BUILTIN_RESOLUTION));
        const filter = desc.filter ?? "linear";
        const colorSpace = desc.colorSpace ?? "srgb";
        const normalized = normalizeStops(stops);
        const samples: Color4[] = new Array(resolution);
        for (let i = 0; i < resolution; i++) {
            const t = resolution === 1 ? 0 : i / (resolution - 1);
            samples[i] = sampleStopsLinear(normalized, t);
        }
        const rgba8Linear = toRGBA8Linear(samples, colorSpace);
        return new Colormap({
            label: "Colormap.customStops",
            width: resolution,
            filter,
            rgba8Linear
        });
    }

    static fromPalette(colors: ReadonlyArray<Color4>, desc: ColormapDescriptor = {}): Colormap {
        assert(colors.length >= 1, "Colormap.fromPalette: expected at least 1 color.");
        const filter = desc.filter ?? "nearest";
        const colorSpace = desc.colorSpace ?? "srgb";
        const rgba8Linear = toRGBA8Linear(colors, colorSpace);
        return new Colormap({
            label: "Colormap.palette",
            width: colors.length,
            filter,
            rgba8Linear
        });
    }

    static fromGPUTextureView(device: GPUDevice, view: GPUTextureView, sampler: GPUSampler, width: number, filter: ColormapFilter = "linear"): Colormap {
        assert(width > 0, "Colormap.fromGPUTextureView: width must be > 0.");
        return new Colormap({
            label: "Colormap.external",
            width,
            filter,
            external: { device, view, sampler, width, filter }
        });
    }

    get width(): number {
        return this._width;
    }

    get filter(): ColormapFilter {
        return this._filter;
    }

    get canSampleCPU(): boolean {
        return this._rgba8Linear !== null;
    }

    getRGBA8LinearLUT(): Uint8Array {
        if (!this._rgba8Linear) throw new Error("Colormap: CPU sampling is unavailable for external GPU-only colormaps.");
        return this._rgba8Linear.slice();
    }

    sampleCPU(t: number): Color4 {
        const rgba8 = this._rgba8Linear;
        if (!rgba8) throw new Error("Colormap: CPU sampling is unavailable for external GPU-only colormaps.");
        if (this._filter === "nearest") return sampleRGBA8Nearest(rgba8, this._width, t);
        return sampleRGBA8Linear(rgba8, this._width, t);
    }

    getGPUResources(device: GPUDevice, queue: GPUQueue): ColormapGPUResources {
        if (this._external) {
            assert(this._external.device === device, "Colormap: external texture was created with a different GPUDevice.");
            return {
                texture: null,
                view: this._external.view,
                sampler: this._external.sampler,
                width: this._external.width,
                filter: this._external.filter,
            };
        }
        const cached = this._gpuByDevice.get(device);
        if (cached) return cached;
        const rgba8 = this._rgba8Linear ?? (() => {
            throw new Error("Colormap: no LUT data to upload.");
        })();
        const texture = createTexture1DFromRGBA8(device, queue, rgba8, this._width, this._label);
        const view = texture.createView({ dimension: "1d" });
        const sampler = createSampler(device, this._filter);
        const res: ColormapGPUResources = {
            texture,
            view,
            sampler,
            width: this._width,
            filter: this._filter
        };
        this._gpuByDevice.set(device, res);
        return res;
    }

    toUniformStops(maxStops: number = 8, colorSpace: "srgb" | "linear" = "linear"): Color4[] {
        const n = Math.max(2, Math.min(8, Math.floor(maxStops)));
        const rgba8 = this._rgba8Linear;
        if (!rgba8) {
            return [
                [0, 0, 0, 1],
                [1, 1, 1, 1],
            ];
        }
        const out: Color4[] = new Array(n);
        for (let i = 0; i < n; i++) {
            const t = n === 1 ? 0 : i / (n - 1);
            const x = Math.min(this._width - 1, Math.max(0, Math.round(t * (this._width - 1))));
            const r = rgba8[x * 4 + 0] / 255;
            const g = rgba8[x * 4 + 1] / 255;
            const b = rgba8[x * 4 + 2] / 255;
            const a = rgba8[x * 4 + 3] / 255;
            if (colorSpace === "linear") out[i] = [r, g, b, a];
            else {
                const toSrgb = (v: number): number => {
                    if (v <= 0.0031308) return 12.92 * v;
                    return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
                };
                out[i] = [toSrgb(r), toSrgb(g), toSrgb(b), a];
            }
        }
        return out;
    }
}

const BUILTIN_SINGLETONS: Record<BuiltinColormapName, Colormap> = {
    grayscale: new Colormap({
        label: "Colormap.grayscale",
        width: BUILTIN_RESOLUTION,
        filter: "linear",
        rgba8Linear: ensureBuiltinRGBA8Linear("grayscale")
    }),
    turbo: new Colormap({
        label: "Colormap.turbo",
        width: BUILTIN_RESOLUTION,
        filter: "linear",
        rgba8Linear: ensureBuiltinRGBA8Linear("turbo")
    }),
    viridis: new Colormap({
        label: "Colormap.viridis",
        width: BUILTIN_RESOLUTION,
        filter: "linear",
        rgba8Linear: ensureBuiltinRGBA8Linear("viridis")
    }),
    magma: new Colormap({
        label: "Colormap.magma",
        width: BUILTIN_RESOLUTION,
        filter: "linear",
        rgba8Linear: ensureBuiltinRGBA8Linear("magma")
    }),
    plasma: new Colormap({
        label: "Colormap.plasma",
        width: BUILTIN_RESOLUTION,
        filter: "linear",
        rgba8Linear: ensureBuiltinRGBA8Linear("plasma")
    }),
    inferno: new Colormap({
        label: "Colormap.inferno",
        width: BUILTIN_RESOLUTION,
        filter: "linear",
        rgba8Linear: ensureBuiltinRGBA8Linear("inferno")
    })
};
