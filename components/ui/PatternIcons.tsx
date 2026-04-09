import React from "react";
import Svg, { Path, Line, Circle, Polyline } from "react-native-svg";
import type { PatternType } from "@/shared/stockTypes";

interface PatternIconProps {
  type: PatternType;
  size?: number;
  color?: string;
}

/**
 * 패턴별 SVG 아이콘 컴포넌트
 * 각 패턴의 기하학적 특징을 살린 명확한 디자인
 */
export function PatternIcon({ type, size = 24, color = "#3B82F6" }: PatternIconProps) {
  const viewBoxSize = 100;

  switch (type) {
    // 쌍바닥 (Double Bottom) - V자 모양 두 개
    case "double_bottom":
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          {/* 첫 번째 V */}
          <Polyline
            points="10,30 25,70 40,30"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 두 번째 V */}
          <Polyline
            points="50,30 65,70 80,30"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 넥라인 */}
          <Line x1="10" y1="30" x2="90" y2="30" stroke={color} strokeWidth="1.5" strokeDasharray="3,3" />
        </Svg>
      );

    // 쌍봉 (Double Top) - 역 V자 모양 두 개
    case "double_top":
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          {/* 첫 번째 역 V */}
          <Polyline
            points="10,70 25,30 40,70"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 두 번째 역 V */}
          <Polyline
            points="50,70 65,30 80,70"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 넥라인 */}
          <Line x1="10" y1="70" x2="90" y2="70" stroke={color} strokeWidth="1.5" strokeDasharray="3,3" />
        </Svg>
      );

    // 헤드앤숄더 (Head & Shoulders) - 세 봉우리 (중간이 높음)
    case "head_and_shoulders":
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          {/* 왼쪽 어깨 */}
          <Polyline
            points="15,60 25,35 35,60"
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 머리 */}
          <Polyline
            points="35,60 50,20 65,60"
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 오른쪽 어깨 */}
          <Polyline
            points="65,60 75,35 85,60"
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 넥라인 */}
          <Line x1="15" y1="60" x2="85" y2="60" stroke={color} strokeWidth="1.5" strokeDasharray="3,3" />
        </Svg>
      );

    // 역헤드앤숄더 (Inverse Head & Shoulders) - 세 골짜기 (중간이 낮음)
    case "inverse_head_and_shoulders":
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          {/* 왼쪽 어깨 */}
          <Polyline
            points="15,40 25,65 35,40"
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 머리 */}
          <Polyline
            points="35,40 50,80 65,40"
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 오른쪽 어깨 */}
          <Polyline
            points="65,40 75,65 85,40"
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 넥라인 */}
          <Line x1="15" y1="40" x2="85" y2="40" stroke={color} strokeWidth="1.5" strokeDasharray="3,3" />
        </Svg>
      );

    // 컵앤핸들 (Cup & Handle) - 둥근 컵 + 작은 조정
    case "cup_and_handle":
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          {/* 컵 (둥근 바닥) */}
          <Path
            d="M 20 40 Q 20 70 50 70 Q 80 70 80 40"
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 핸들 */}
          <Path
            d="M 70 40 Q 85 35 80 25"
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 상승 화살표 */}
          <Polyline
            points="50,15 50,5 45,10"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points="50,15 50,5 55,10"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    // 상승 삼각형 (Ascending Triangle)
    case "ascending_triangle":
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          {/* 수평 저항선 */}
          <Line x1="20" y1="30" x2="80" y2="30" stroke={color} strokeWidth="2" />
          {/* 상승하는 지지선 */}
          <Line x1="20" y1="75" x2="80" y2="35" stroke={color} strokeWidth="2" />
          {/* 닫힌 삼각형 */}
          <Polyline
            points="20,30 80,30 80,35 20,75 20,30"
            stroke={color}
            strokeWidth="1"
            fill={color}
            fillOpacity="0.1"
            strokeLinejoin="round"
          />
          {/* 돌파 화살표 */}
          <Polyline
            points="50,20 50,10 45,15"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points="50,20 50,10 55,15"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    // 플래그/페넌트 (Flag & Pennant)
    case "flag_pennant":
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          {/* 급등 폴 */}
          <Line x1="20" y1="70" x2="20" y2="25" stroke={color} strokeWidth="2" />
          {/* 플래그 사각형 */}
          <Polyline
            points="20,30 50,30 50,55 20,55 20,30"
            stroke={color}
            strokeWidth="2"
            fill={color}
            fillOpacity="0.1"
            strokeLinejoin="round"
          />
          {/* 돌파 화살표 */}
          <Polyline
            points="50,20 60,10 55,15"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points="50,20 60,10 65,15"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    // 기본값 - 일반 차트 아이콘
    default:
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
          <Polyline
            points="15,70 35,40 55,50 75,25"
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="15" cy="70" r="2" fill={color} />
          <Circle cx="35" cy="40" r="2" fill={color} />
          <Circle cx="55" cy="50" r="2" fill={color} />
          <Circle cx="75" cy="25" r="2" fill={color} />
        </Svg>
      );
  }
}
