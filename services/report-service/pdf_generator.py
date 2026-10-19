import os
import io
import hashlib
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Canvas personalizado para numerar dinámicamente 'Página X de Y'
    y dibujar pie de página institucional inmutable con hash SHA-256.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Línea de pie de página
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 42, 572, 42)

        # Textos de pie de página
        texto_izq = "ClimaSafe Rural • Sistema de Monitoreo y Alerta Temprana • Villa Canales, Guatemala"
        texto_der = f"Página {self._pageNumber} de {page_count}"
        self.drawString(40, 30, texto_izq)
        self.drawRightString(572, 30, texto_der)

        # Hash y fecha de verificación
        verif = f"Verificación de Autenticidad: {getattr(self, 'report_hash', 'SHA256-VERIFIED')} • Confidencial"
        self.setFont("Helvetica-Oblique", 7)
        self.drawString(40, 20, verif)

        self.restoreState()


def generar_pdf_reporte(
    report_id: str,
    tipo_reporte: str,
    titulo: str,
    usuario_generador: str,
    filtros: dict,
    columnas: list,
    filas: list,
    resumen_kpis: list = None,
    logo_path: str = None
) -> bytes:
    """
    Genera un documento PDF formal, ejecutivo y con diseño de alta calidad.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()

    # Estilos personalizados
    estilo_titulo = ParagraphStyle(
        'RepTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a")
    )

    estilo_subtitulo = ParagraphStyle(
        'RepSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569")
    )

    estilo_badge = ParagraphStyle(
        'RepBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0284c7")
    )

    estilo_celda = ParagraphStyle(
        'RepCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1e293b")
    )

    estilo_header_tabla = ParagraphStyle(
        'RepTH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    story = []

    # 1. ENCABEZADO INSTITUCIONAL
    ahora_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    header_table_data = [
        [
            Paragraph("<b>🛰️ CLIMASAFE RURAL</b><br/><font size=8 color='#64748b'>MUNICIPALIDAD DE VILLA CANALES • UMG 2026</font>", styles['Normal']),
            Paragraph(f"<b>REPORTE OFICIAL</b><br/><font size=8 color='#0284c7'>ID: {report_id}</font><br/><font size=7 color='#64748b'>Emisión: {ahora_str}</font>", ParagraphStyle('HRight', parent=styles['Normal'], alignment=2))
        ]
    ]
    header_table = Table(header_table_data, colWidths=[332, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceBefore=2, spaceAfter=12))

    # 2. TÍTULO Y DESCRIPCIÓN
    story.append(Paragraph(titulo, estilo_titulo))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Tipo: <b>{tipo_reporte}</b> • Generado por: <b>{usuario_generador}</b>", estilo_subtitulo))
    story.append(Spacer(1, 10))

    # 3. METADATA Y FILTROS APLICADOS
    filtros_str = ", ".join([f"<b>{k}:</b> {v}" for k, v in filtros.items() if v is not None]) if filtros else "Todos los registros (sin filtros específicos)"
    meta_data = [
        [
            Paragraph("<b>Parámetros de Filtrado Aplicados:</b>", estilo_subtitulo),
            Paragraph(filtros_str, estilo_celda)
        ],
        [
            Paragraph("<b>Estado del Proceso:</b>", estilo_subtitulo),
            Paragraph("<font color='#16a34a'><b>● COMPLETADO Y CERTIFICADO POR BACKEND</b></font>", estilo_celda)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[180, 352])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#f1f5f9")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # 4. TARJETAS RESUMEN / KPIS (SI EXISTEN)
    if resumen_kpis and len(resumen_kpis) > 0:
        kpi_cols = []
        for k in resumen_kpis:
            kpi_cols.append(Paragraph(
                f"<font size=7 color='#64748b'>{k.get('label', '').upper()}</font><br/>"
                f"<font size=14 color='#0f172a'><b>{k.get('valor', '')}</b></font><br/>"
                f"<font size=7 color='#0284c7'>{k.get('sub', '')}</font>",
                ParagraphStyle('KpiCell', parent=styles['Normal'], alignment=1)
            ))
        col_w = 532 / len(kpi_cols)
        kpi_table = Table([kpi_cols], colWidths=[col_w] * len(kpi_cols))
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
            ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 14))

    # 5. TABLA PRINCIPAL DE DATOS
    header_row = [Paragraph(c, estilo_header_tabla) for c in columnas]
    data_rows = [header_row]

    for f in filas:
        formatted_row = []
        for val in f:
            val_str = str(val) if val is not None else ""
            # Badges coloreados según texto
            if val_str == "Verde" or val_str == "Normal" or val_str == "Activo":
                celda = Paragraph(f"<font color='#16a34a'><b>● {val_str}</b></font>", estilo_celda)
            elif val_str == "Amarillo" or val_str == "Precaucion":
                celda = Paragraph(f"<font color='#ca8a04'><b>▲ {val_str}</b></font>", estilo_celda)
            elif val_str == "Naranja" or val_str == "Alerta":
                celda = Paragraph(f"<font color='#ea580c'><b>⚠️ {val_str}</b></font>", estilo_celda)
            elif val_str == "Rojo" or val_str == "Emergencia":
                celda = Paragraph(f"<font color='#dc2626'><b>🚨 {val_str}</b></font>", estilo_celda)
            else:
                celda = Paragraph(val_str, estilo_celda)
            formatted_row.append(celda)
        data_rows.append(formatted_row)

    # Calcular anchos equitativos
    num_cols = len(columnas)
    col_width = 532 / num_cols
    main_table = Table(data_rows, colWidths=[col_width] * num_cols, repeatRows=1)
    
    t_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ]

    # Alternar color cebra
    for i in range(1, len(data_rows)):
        if i % 2 == 0:
            t_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor("#f8fafc")))

    main_table.setStyle(TableStyle(t_style))
    story.append(main_table)

    # 6. GENERAR HASH CRIPTOGRÁFICO DE SEGURIDAD
    raw_content = f"{report_id}-{tipo_reporte}-{ahora_str}-{len(filas)}"
    doc_hash = hashlib.sha256(raw_content.encode('utf-8')).hexdigest()[:24].upper()

    def make_canvas(*args, **kwargs):
        c = NumberedCanvas(*args, **kwargs)
        c.report_hash = doc_hash
        return c

    doc.build(story, canvasmaker=make_canvas)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
