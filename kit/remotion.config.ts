import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// x264 com CRF baixo: o Meta recomprime, entao entrega com folga de qualidade.
Config.setCodec("h264");
Config.setCrf(18);
