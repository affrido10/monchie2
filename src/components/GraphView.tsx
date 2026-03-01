import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';

interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tags: string[];
  linkCount: number;
  updatedAt: Date;
}

interface GraphEdge {
  source: string;
  target: string;
}

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

export default function GraphView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { notes, setActiveNote, setPanelView } = useVaultStore();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animRef = useRef<number | undefined>(undefined);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragNode = useRef<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const frameRef = useRef(0);
  const [_zoomDisplay, setZoomDisplay] = useState(1);
  const [_panDisplay, setPanDisplay] = useState({ x: 0, y: 0 });

  const setZoom = (z: number) => {
    zoomRef.current = z;
    setZoomDisplay(z);
  };
  const setPan = (p: { x: number; y: number }) => {
    panRef.current = p;
    setPanDisplay(p);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Build graph
    const nodes: GraphNode[] = notes.map((n, i) => {
      const angle = (i / notes.length) * Math.PI * 2;
      const radius = 150 + Math.random() * 100;
      return {
        id: n.id,
        title: n.title,
        x: canvas.width / 2 + Math.cos(angle) * radius,
        y: canvas.height / 2 + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        tags: n.tags,
        linkCount: n.linkedNoteIds.length,
        updatedAt: n.updatedAt,
      };
    });

    const edges: GraphEdge[] = [];
    notes.forEach((n) => {
      n.linkedNoteIds.forEach((targetId) => {
        if (notes.find((t) => t.id === targetId)) {
          edges.push({ source: n.id, target: targetId });
        }
      });
      // Also extract wiki-links from content
      const wikiLinks = n.content.match(/\[\[([^\]]+)\]\]/g) || [];
      wikiLinks.forEach((link) => {
        const title = link.slice(2, -2);
        const target = notes.find((t) => t.title === title);
        if (target && !edges.find((e) => e.source === n.id && e.target === target.id)) {
          edges.push({ source: n.id, target: target.id });
        }
      });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;

    // Physics simulation
    function simulate() {
      const ns = nodesRef.current;
      const es = edgesRef.current;
      const W = canvas!.width;
      const H = canvas!.height;

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[i].x - ns[j].x;
          const dy = ns[i].y - ns[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 3000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          ns[i].vx += fx;
          ns[i].vy += fy;
          ns[j].vx -= fx;
          ns[j].vy -= fy;
        }
      }

      // Attraction for edges
      es.forEach((e) => {
        const src = ns.find((n) => n.id === e.source);
        const tgt = ns.find((n) => n.id === e.target);
        if (!src || !tgt) return;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.003;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        src.vx += fx; src.vy += fy;
        tgt.vx -= fx; tgt.vy -= fy;
      });

      // Center gravity
      ns.forEach((n) => {
        n.vx += (W / 2 - n.x) * 0.0005;
        n.vy += (H / 2 - n.y) * 0.0005;

        // Damping
        n.vx *= 0.85;
        n.vy *= 0.85;

        if (n.id !== dragNode.current) {
          n.x += n.vx;
          n.y += n.vy;
        }

        // Bounds
        n.x = Math.max(20, Math.min(W - 20, n.x));
        n.y = Math.max(20, Math.min(H - 20, n.y));
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      frameRef.current++;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);
      ctx.scale(zoomRef.current, zoomRef.current);

      const ns = nodesRef.current;
      const es = edgesRef.current;
      const hovered = hoveredRef.current;

      // Draw potential connections (nodes close but not linked)
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[i].x - ns[j].x;
          const dy = ns[i].y - ns[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const linked = es.some(
            (e) =>
              (e.source === ns[i].id && e.target === ns[j].id) ||
              (e.source === ns[j].id && e.target === ns[i].id)
          );
          if (!linked && dist < 100) {
            ctx.beginPath();
            ctx.moveTo(ns[i].x, ns[i].y);
            ctx.lineTo(ns[j].x, ns[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.02 * (1 - dist / 100)})`;
            ctx.setLineDash([2, 4]);
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Draw edges
      es.forEach((e) => {
        const src = ns.find((n) => n.id === e.source);
        const tgt = ns.find((n) => n.id === e.target);
        if (!src || !tgt) return;

        const isHighlighted =
          !hovered ||
          e.source === hovered ||
          e.target === hovered;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = isHighlighted
          ? 'rgba(124,58,237,0.5)'
          : 'rgba(124,58,237,0.1)';
        ctx.lineWidth = isHighlighted ? 1.5 : 0.5;
        ctx.stroke();

        // Particle along edge
        if (isHighlighted) {
          const t = (frameRef.current * 0.008) % 1;
          const px = src.x + (tgt.x - src.x) * t;
          const py = src.y + (tgt.y - src.y) * t;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(167,139,250,0.8)';
          ctx.fill();
        }
      });

      // Draw nodes
      ns.forEach((n) => {
        const isHovered = n.id === hovered;
        const daysSinceEdit = (Date.now() - n.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        let nodeOpacity = 1;
        if (daysSinceEdit > 180) nodeOpacity = 0.2;
        else if (daysSinceEdit > 30) nodeOpacity = 0.5;
        else if (daysSinceEdit > 7) nodeOpacity = 0.8;

        if (hovered && !isHovered) {
          const connected = es.some(
            (e) =>
              (e.source === n.id && e.target === hovered) ||
              (e.target === n.id && e.source === hovered)
          );
          if (!connected) nodeOpacity *= 0.2;
        }

        const r = 4 + Math.min(n.linkCount * 2, 12);
        const color = n.tags[0] ? tagColor(n.tags[0]) : '#7c3aed';

        // Glow for recently edited
        if (daysSinceEdit < 1) {
          const pulse = Math.sin(frameRef.current * 0.05) * 0.3 + 0.7;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(124,58,237,${0.15 * pulse})`;
          ctx.fill();
        }

        // Hover glow
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(167,139,250,0.2)';
          ctx.fill();
        }

        ctx.globalAlpha = nodeOpacity;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Label
        if (isHovered || zoomRef.current > 0.8) {
          ctx.fillStyle = `rgba(255,255,255,${nodeOpacity * 0.8})`;
          ctx.font = `${isHovered ? 'bold ' : ''}${10 / zoomRef.current}px system-ui`;
          ctx.textAlign = 'center';
          const label = n.title.length > 15 ? n.title.slice(0, 15) + '…' : n.title;
          ctx.fillText(label, n.x, n.y + r + 12 / zoomRef.current);
        }
      });

      ctx.restore();

      simulate();
      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [notes]);

  const getNodeAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - panRef.current.x) / zoomRef.current;
    const y = (clientY - rect.top - panRef.current.y) / zoomRef.current;
    return nodesRef.current.find((n) => {
      const r = 4 + Math.min(n.linkCount * 2, 12);
      return Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) < r + 4;
    }) || null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
      setPan({ ...panRef.current });
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (dragNode.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 4) dragMoved.current = true;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
      const y = (e.clientY - rect.top - panRef.current.y) / zoomRef.current;
      const node = nodesRef.current.find((n) => n.id === dragNode.current);
      if (node) { node.x = x; node.y = y; }
      return;
    }
    const node = getNodeAt(e.clientX, e.clientY);
    const id = node?.id || null;
    hoveredRef.current = id;
    setHoveredNode(id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const node = getNodeAt(e.clientX, e.clientY);
    if (node) {
      dragNode.current = node.id;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      dragMoved.current = false;
    } else {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const wasDragNode = dragNode.current;
    const didMove = dragMoved.current;
    dragNode.current = null;
    dragMoved.current = false;
    isPanning.current = false;

    // Single click (no significant drag movement) opens the note
    if (wasDragNode && !didMove) {
      const node = getNodeAt(e.clientX, e.clientY);
      if (node) {
        setActiveNote(node.id);
        setPanelView('editor');
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const node = getNodeAt(e.clientX, e.clientY);
    if (node) {
      setActiveNote(node.id);
      setPanelView('editor');
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomRef.current = Math.max(0.2, Math.min(3, zoomRef.current * factor));
    setZoom(zoomRef.current);
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: hoveredNode ? 'pointer' : 'grab' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
        {[
          { icon: ZoomIn, action: () => { zoomRef.current = Math.min(3, zoomRef.current * 1.2); setZoom(zoomRef.current); } },
          { icon: ZoomOut, action: () => { zoomRef.current = Math.max(0.2, zoomRef.current / 1.2); setZoom(zoomRef.current); } },
          { icon: Maximize2, action: () => { zoomRef.current = 1; panRef.current = { x: 0, y: 0 }; setZoom(1); setPan({ x: 0, y: 0 }); } },
        ].map(({ icon: Icon, action }, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.9 }}
            onClick={action}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            style={{
              background: 'rgba(10,10,15,0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Icon className="w-4 h-4" />
          </motion.button>
        ))}
      </div>

      {/* Legend */}
      <div
        className="absolute top-4 left-4 p-3 rounded-xl text-xs"
        style={{
          background: 'rgba(10,10,15,0.7)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="text-slate-500 mb-2 font-medium">Graph View</div>
        <div className="space-y-1 text-slate-600">
          <div>Click node to open</div>
          <div>Drag to move nodes</div>
          <div>Scroll to zoom</div>
        </div>
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="text-slate-500">{notes.length} notes</div>
        </div>
      </div>

      {/* Hovered node info */}
      {hoveredNode && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 p-3 rounded-xl max-w-48"
          style={{
            background: 'rgba(10,10,15,0.9)',
            border: '1px solid rgba(124,58,237,0.3)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {(() => {
            const note = nodesRef.current.find((n) => n.id === hoveredNode);
            return note ? (
              <>
                <div className="text-xs text-slate-200 font-medium mb-1">{note.title}</div>
                <div className="text-xs text-slate-500">{note.linkCount} links</div>
              </>
            ) : null;
          })()}
        </motion.div>
      )}
    </div>
  );
}
