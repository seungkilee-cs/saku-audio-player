import imgStraySheep from "../img/stray_sheep.png";
import imgPaleBlue from "../img/pale_blue.png";
import imgPeterPan from "../img/peter_pan.jpg";
import imgBan from "../img/ban.jpg";
import imgNobodysFault from "../img/nobodys_fault.jpg";
import imgWolpis1 from "../img/wolpis1.jpg"
import imgWolpis2 from "../img/wolpis2.jpg"


import placebo from "../audio/PLACEBO.flac";
import shinigami from "../audio/Shinigami.flac";
import yasashii from "../audio/Yasashii Hito.flac";
import peterPan from "../audio/Peter Pan.flac";
import ban from "../audio/Ban.flac";
import nazekoi from "../audio/Naze koi wo shitekonakattandarou .flac";
import bluemoonKiss from "../audio/Blue Moon Kiss.flac";
import amegoe from "../audio/07. 雨き声残響.mp3";
import mukaga from "../audio/08. 無花果.mp3";
import tokiame from "../audio/11. 時の雨、最終戦争.mp3";
import seiten from "../audio/12. 晴天前夜.mp3";
import cosmos from "../audio/ウォルピス社-COSMOS.mp3";

const tracks = [
    {
        title: "BAN",
        artist: "Sakurazak46",
        audioSrc: ban,
        image: imgBan,
        color: "#ffb77a"
    },
    {
        title: "Blue Moon Kiss",
        artist: "Sakurazak46",
        audioSrc: bluemoonKiss,
        image: imgNobodysFault,
        color: "#ffb77a"
    },
    {
        title: "なぜ　恋をして来なかったんだろう？",
        artist: "Sakurazak46",
        audioSrc: nazekoi,
        image: imgNobodysFault,
        color: "#ffb77a"
    },
    {
        title: "雨き声残響",
        artist: "ウォルピスカーター",
        audioSrc: amegoe,
        image: imgWolpis1,
        color: "#00aeb0"
    },
    {
        title: "無花果",
        artist: "ウォルピスカーター",
        audioSrc: mukaga,
        image: imgWolpis1,
        color: "#00aeb0"
    },
    {
        title: "時の雨、最終戦争",
        artist: "ウォルピスカーター",
        audioSrc: tokiame,
        image: imgWolpis2,
        color: "#00aeb0"
    },
    {
        title: "晴天前夜",
        artist: "ウォルピスカーター",
        audioSrc: seiten,
        image: imgWolpis1,
        color: "#00aeb0"
    },
    {
        title: "COSMOS",
        artist: "ウォルピスカーター",
        audioSrc: cosmos,
        image: imgWolpis2,
        color: "#00aeb0"
    },
    {
        title: "PLACEBO",
        artist: "Yonezu Kenshi",
        audioSrc: placebo,
        image: imgStraySheep,
        color: "#00aeb0"
    },
    {
        title: "Yasashii Hito",
        artist: "Yonezu Kenshi",
        audioSrc: yasashii,
        image: imgStraySheep,
        color: "#00aeb0"
    },
    {
        title: "Shinigami",
        artist: "Yonezu Kenshi",
        audioSrc: shinigami,
        image: imgPaleBlue,
        color: "#ffb77a"
    },
    {
        title: "Peter Pan",
        artist: "Yuuri",
        audioSrc: peterPan,
        image: imgPeterPan,
        color: "#5f9fff"
    },
]

export default tracks;