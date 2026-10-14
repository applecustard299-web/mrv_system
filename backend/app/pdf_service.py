import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_monitoring_report_pdf(report, project, verification=None) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0B192C')
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0F766E')
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0B192C'),
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1E293B')
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#FFFFFF'),
        alignment=1
    )

    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Italic'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#64748B')
    )

    story = []

    # Header Banner
    story.append(Paragraph("BLUE CARBON REGISTRY & MRV SYSTEM", subtitle_style))
    story.append(Paragraph(f"Official Monitoring Report: {report.report_code}", title_style))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0F766E'), spaceAfter=12))

    # Project Overview Table
    dev_name = project.developer_org.name if project.developer_org else "Independent Project Developer"
    status_color = colors.HexColor('#15803D') if report.status == "Approved" else colors.HexColor('#D97706')
    
    overview_data = [
        [
            Paragraph("<b>Project Code:</b>", body_style), Paragraph(str(project.project_code), body_style),
            Paragraph("<b>Ecosystem Type:</b>", body_style), Paragraph(str(project.ecosystem_type), body_style)
        ],
        [
            Paragraph("<b>Project Name:</b>", body_style), Paragraph(str(project.name), body_style),
            Paragraph("<b>Reporting Period:</b>", body_style), Paragraph(f"{report.reporting_period_start} to {report.reporting_period_end}", body_style)
        ],
        [
            Paragraph("<b>Developer Org:</b>", body_style), Paragraph(dev_name, body_style),
            Paragraph("<b>Report Status:</b>", body_style), Paragraph(f"<b>{report.status.upper()}</b>", body_style)
        ],
        [
            Paragraph("<b>Location:</b>", body_style), Paragraph(f"{project.site_name}, {project.region}, {project.country}", body_style),
            Paragraph("<b>Project Area:</b>", body_style), Paragraph(f"{project.total_area_ha:,.1f} Hectares", body_style)
        ]
    ]

    t_overview = Table(overview_data, colWidths=[100, 170, 100, 170])
    t_overview.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_overview)
    story.append(Spacer(1, 12))

    # Executive Summary
    story.append(Paragraph("1. Monitoring Summary & Field Observations", section_heading))
    story.append(Paragraph(report.summary, body_style))
    story.append(Spacer(1, 10))

    # Quantitative Baseline & Carbon Calculation
    story.append(Paragraph("2. Carbon Accounting & Estimated Removals", section_heading))
    carbon_data = [
        [Paragraph("<b>Component</b>", body_style), Paragraph("<b>Value / Metric</b>", body_style), Paragraph("<b>Scientific Source & Assumption</b>", body_style)],
        [Paragraph("Project Total Area", body_style), Paragraph(f"{project.total_area_ha:,.1f} ha", body_style), Paragraph("GIS Polygon Ground-Truthed Boundary", body_style)],
        [Paragraph("Calculated Net Removals", body_style), Paragraph(f"<b>{report.calculated_net_tco2e:,.1f} tCO₂e</b>", body_style), Paragraph("Tier 2 Coastal Wetland Accounting", body_style)],
        [Paragraph("Baseline Condition", body_style), Paragraph(f"{project.baseline.initial_condition if project.baseline else 'Degraded'}", body_style), Paragraph("Pre-restoration satellite and soil core baseline", body_style)],
        [Paragraph("Uncertainty Buffer", body_style), Paragraph("15% Conservative Deduction", body_style), Paragraph("Methodological conservatism principle", body_style)]
    ]
    t_carbon = Table(carbon_data, colWidths=[160, 130, 250])
    t_carbon.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F766E')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#0F766E')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_carbon)
    story.append(Spacer(1, 12))

    # Verification Decision (if available)
    if verification:
        story.append(Paragraph("3. Independent MRV Verification Findings", section_heading))
        v_data = [
            [Paragraph("<b>Verification Decision:</b>", body_style), Paragraph(f"<b>{verification.decision.upper()}</b>", body_style)],
            [Paragraph("<b>Certificate Number:</b>", body_style), Paragraph(str(verification.certificate_number or 'Pending Certificate'), body_style)],
            [Paragraph("<b>Reviewing Officer:</b>", body_style), Paragraph(str(verification.mrv_officer.full_name if verification.mrv_officer else 'Accredited MRV Officer'), body_style)],
            [Paragraph("<b>Date of Verification:</b>", body_style), Paragraph(str(verification.review_date), body_style)],
            [Paragraph("<b>Findings & Rationale:</b>", body_style), Paragraph(str(verification.findings_summary), body_style)],
            [Paragraph("<b>Verified Net Removals:</b>", body_style), Paragraph(f"<b>{verification.verified_net_removals_tco2e:,.1f} tCO₂e</b>", body_style)]
        ]
        t_verif = Table(v_data, colWidths=[150, 390])
        t_verif.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDF4') if verification.decision == 'Approved' else colors.HexColor('#FEF2F2')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#22C55E') if verification.decision == 'Approved' else colors.HexColor('#EF4444')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#DCFCE7')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t_verif)
        story.append(Spacer(1, 12))

    # Regulatory Disclaimer Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=8))
    story.append(Paragraph(
        "<b>REGULATORY & PROTOTYPE DISCLAIMER:</b> This verification summary document is issued via the Blue Carbon Registry & MRV Prototype Platform for demonstration and stakeholder review. Carbon estimates and reported removals reflect methodology assumptions (IPCC Wetlands Tier 2) and require formal third-party audit prior to regulatory credit issuance.",
        disclaimer_style
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer
