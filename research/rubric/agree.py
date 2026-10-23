# Two scoring passes on the 9 finalists. C1-C3 are computed from VOC (shared by both raters). C4-C14 judged.
C = ["C1 urgency","C2 staying","C3 scope","C4 awareness fit","C5 right problem","C6 timing evidence","C7 one-sentence","C8 differentiation","C9 claim<=proof","C10 mechanism","C11 imp/exc/ben","C12 inevitable","C13 durational","C14 2nd-sentence"]
W = [2,2,2,1,1,1,1,1,2,1,1,2,1,1]
A = {  # pass A
"AG1-F1 energy":      [2,2,1, 2,3,1,2,1,1,1,1,1,2,1],
"AG1-F2 routine":     [3,3,1, 2,2,1,2,2,2,2,2,2,3,2],
"AG1-F3 simplify*":   [3,3,0, 3,1,1,3,2,2,3,2,3,3,3],
"FOOL-F1 returns":    [2,2,3, 2,3,1,2,0,0,1,1,1,2,1],
"FOOL-F2 no-upsell":  [1,1,2, 3,2,2,3,3,3,3,2,3,2,2],
"FOOL-F3 signal":     [1,2,1, 2,2,3,2,2,2,2,2,2,1,2],
"CU-F1 consolidate":  [1,0,2, 2,3,1,3,1,2,2,2,2,3,2],
"CU-F2 overview":     [3,0,1, 2,2,1,2,2,2,2,2,2,3,2],
"CU-F3 time*":        [3,3,0, 2,1,2,2,1,1,2,2,1,2,2],
}
B = {  # pass B
"AG1-F1 energy":      [2,2,1, 2,3,0,2,1,1,1,1,1,2,2],
"AG1-F2 routine":     [3,3,1, 2,2,1,2,2,2,2,2,3,3,2],
"AG1-F3 simplify*":   [3,3,0, 3,1,0,3,1,2,2,2,3,3,2],
"FOOL-F1 returns":    [2,2,3, 2,3,1,2,0,0,0,1,1,2,1],
"FOOL-F2 no-upsell":  [1,1,2, 3,2,2,3,3,3,3,2,2,2,3],
"FOOL-F3 signal":     [1,2,1, 2,2,3,2,2,2,2,1,2,1,2],
"CU-F1 consolidate":  [1,0,2, 2,3,1,3,1,2,2,2,2,3,2],
"CU-F2 overview":     [3,0,1, 3,2,0,3,2,2,2,2,2,3,3],
"CU-F3 time*":        [3,3,0, 2,1,2,2,1,1,2,1,1,2,2],
}
import itertools
def qwk(a,b,k=4):
    n=len(a); O=[[0]*k for _ in range(k)]
    for x,y in zip(a,b): O[x][y]+=1
    ra=[sum(O[i]) for i in range(k)]; rb=[sum(O[i][j] for i in range(k)) for j in range(k)]
    num=den=0
    for i in range(k):
        for j in range(k):
            w=(i-j)**2/(k-1)**2; num+=w*O[i][j]; den+=w*ra[i]*rb[j]/n
    return 1-num/den if den else float('nan')
names=list(A)
print(f"{'criterion':20}{'exact':>7}{'within1':>9}{'QWK':>7}")
for i,c in enumerate(C):
    a=[A[n][i] for n in names]; b=[B[n][i] for n in names]
    ex=sum(x==y for x,y in zip(a,b))/9; w1=sum(abs(x-y)<=1 for x,y in zip(a,b))/9
    print(f"{c:20}{ex:7.2f}{w1:9.2f}{qwk(a,b):7.2f}")
allA=[v for n in names for v in A[n][3:]]; allB=[v for n in names for v in B[n][3:]]
print("judged C4-C14 pooled: exact %.2f within1 %.2f QWK %.2f"%(sum(x==y for x,y in zip(allA,allB))/len(allA), sum(abs(x-y)<=1 for x,y in zip(allA,allB))/len(allA), qwk(allA,allB)))
print("\nWeighted totals (max %d). Gates: desire mag(C1+C2+C3)>=4 with k>=5; C9>=2."%sum(3*w for w in W))
for n in names:
    ta=sum(w*s for w,s in zip(W,A[n])); tb=sum(w*s for w,s in zip(W,B[n]))
    mag=sum(A[n][:3]); g1="PASS" if mag>=4 and not n.endswith("*") else ("PROVISIONAL(k<5)" if n.endswith("*") else "FAIL")
    g2="PASS" if min(A[n][8],B[n][8])>=2 else "FAIL"
    print(f"{n:20} A={ta:3} B={tb:3} mean={(ta+tb)/2:5.1f}  desire-gate={g1:16} proof-gate={g2}")
