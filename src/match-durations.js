// Total match duration, independent of the 33-second turn clock.
export const MATCH_TIME_TARGETS=Object.freeze([33,180,360,540]);
export const matchDurationLabel=(seconds,compact=false)=>seconds<60
 ?`${seconds} ${compact?'s':'segundos'}`
 :`${seconds/60} ${compact?'min':'minutos'}`;
