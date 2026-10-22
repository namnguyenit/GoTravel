"""Figures are generated from the same evidence JSON used by the report."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle,FancyArrowPatch
from .gostay_model import build_model

def generate_figures(report,destination):
    destination=Path(destination);destination.mkdir(parents=True,exist_ok=True)
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10})
    positions={'s0_free':(-2.0,0.0),'s1_holding':(-0.6,0.0),'s2_booked':(0.9,0.9),
               's3_released':(0.9,-0.7),'s4_timeout':(-0.6,-1.6),'s5_bad':(2.2,0.0)}
    labels={'s0_free':'S0\nFREE','s1_holding':'S1\nHOLDING','s2_booked':'S2\nBOOKED',
            's3_released':'S3\nRELEASED','s4_timeout':'S4\nEXPIRED','s5_bad':'S5\nBAD'}
    fig,axes=plt.subplots(2,1,figsize=(7.1,7.7))
    for ax,version in zip(axes,('v0','v1')):
        model=build_model(version);reachable=model.reachable_from()
        for source,targets in model.transitions.items():
            for target in targets:
                x,y=positions[source];u,v=positions[target]
                color='#AD3030' if target=='s5_bad' and source!='s5_bad' else '#526472'
                if source==target:
                    ax.add_patch(FancyArrowPatch((x-.12,y+.24),(x+.12,y+.24),connectionstyle='arc3,rad=-1.8',arrowstyle='-|>',mutation_scale=10,color=color,lw=1))
                else:
                    rad=.16 if (target,source) in {(b,a) for a in model.transitions for b in model.transitions[a]} else .06
                    ax.add_patch(FancyArrowPatch((x,y),(u,v),connectionstyle=f'arc3,rad={rad}',arrowstyle='-|>',mutation_scale=12,shrinkA=21,shrinkB=23,color=color,lw=1.2))
        for state,(x,y) in positions.items():
            face='#F8DADA' if state=='s5_bad' and state in reachable else '#E6EEF5' if state in reachable else '#F0F0F0'
            ax.add_patch(Circle((x,y),.30,facecolor=face,edgecolor='#304A60',lw=1.1))
            ax.text(x,y,labels[state],ha='center',va='center',fontsize=9)
        ax.set_xlim(-2.6,2.8);ax.set_ylim(-2.15,1.65);ax.set_aspect('equal');ax.axis('off')
        ax.set_title(version+'   '+('reachable BAD and indefinite expiry wait' if version=='v0' else 'BAD unreachable; cleanup assumes eventual successful worker'),fontsize=10,pad=8)
    fig.subplots_adjust(hspace=.16,top=.97,bottom=.03,left=.03,right=.97)
    fig.savefig(destination/'kripke_v0_v1.png',dpi=260);plt.close(fig)
    fig,ax=plt.subplots(figsize=(7.0,2.1));ax.axis('off')
    bounds=sorted({r['k'] for r in report['bmc']});matrix=[]
    for version in ('v0','v1'):matrix.append([version]+[next(r['status'] for r in report['bmc'] if r['version']==version and r['k']==k) for k in bounds])
    table=ax.table(cellText=matrix,colLabels=['Version']+[f'k = {k}' for k in bounds],cellLoc='center',loc='center')
    table.auto_set_font_size(False);table.set_fontsize(11);table.scale(1,1.8)
    for (r,c),cell in table.get_celld().items():
        cell.set_edgecolor('#CCD4DC')
        if r==0:cell.set_facecolor('#233F5D');cell.get_text().set_color('white')
    fig.tight_layout();fig.savefig(destination/'bmc_bounds.png',dpi=260);plt.close(fig)
    return {'status':'PASS','files':['kripke_v0_v1.png','bmc_bounds.png']}

if __name__=='__main__':
    root=Path(__file__).resolve().parents[4]
    generate_figures(json.loads((root/'04_Ket_qua/data/verification_results.json').read_text(encoding='utf-8')),root/'04_Ket_qua/hinh')
