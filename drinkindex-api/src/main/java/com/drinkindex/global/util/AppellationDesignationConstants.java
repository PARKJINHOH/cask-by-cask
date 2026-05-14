package com.drinkindex.global.util;

import java.util.List;

public final class AppellationDesignationConstants {

    private AppellationDesignationConstants() {}

    public static final List<String> ALL = List.of(
            // 프랑스 AOC
            "AOC Bordeaux", "AOC Bourgogne", "AOC Champagne", "AOC Alsace",
            "AOC Côtes du Rhône", "AOC Saint-Émilion", "AOC Pomerol", "AOC Margaux",
            "AOC Pauillac", "AOC Saint-Julien", "AOC Sauternes", "AOC Chablis",
            "AOC Pouilly-Fuissé", "AOC Meursault", "AOC Puligny-Montrachet",
            "AOC Gevrey-Chambertin", "AOC Nuits-Saint-Georges", "AOC Beaujolais",
            "AOC Côtes de Provence", "AOC Languedoc",
            // 이탈리아 DOC/DOCG
            "DOC Chianti", "DOCG Chianti Classico", "DOCG Barolo", "DOCG Barbaresco",
            "DOCG Brunello di Montalcino", "DOC Amarone della Valpolicella",
            "DOC Bolgheri", "DOC Valpolicella", "DOCG Prosecco", "DOC Soave",
            // 스페인 DO
            "DO Rioja", "DOCa Rioja", "DO Ribera del Duero", "DO Priorat",
            "DOCa Priorat", "DO Penedès", "DO Rías Baixas", "DO Jerez",
            // 포르투갈
            "DOC Douro", "DOC Porto", "DOC Alentejo", "DOC Vinho Verde",
            // 독일 QmP
            "QmP Mosel", "QmP Rheingau", "QmP Rheinhessen", "QmP Pfalz",
            // 미국 AVA
            "AVA Napa Valley", "AVA Sonoma Coast", "AVA Willamette Valley",
            "AVA Russian River Valley", "AVA Alexander Valley", "AVA Santa Barbara County",
            "AVA Paso Robles", "AVA Columbia Valley",
            // 호주 GI
            "GI Barossa Valley", "GI McLaren Vale", "GI Clare Valley",
            "GI Margaret River", "GI Yarra Valley", "GI Hunter Valley",
            // 뉴질랜드
            "GI Marlborough", "GI Central Otago", "GI Hawke's Bay",
            // 아르헨티나
            "DOC Mendoza", "DOC Luján de Cuyo", "DOC Valle de Uco",
            // 칠레
            "DO Maipo Valley", "DO Colchagua Valley", "DO Casablanca Valley",
            // 남아프리카공화국
            "WO Stellenbosch", "WO Franschhoek", "WO Swartland"
    );
}
