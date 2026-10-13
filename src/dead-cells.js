export const isDeadCell=(room,x,y)=>(room?.deadCells||[]).some(c=>c.x===x&&c.y===y);
