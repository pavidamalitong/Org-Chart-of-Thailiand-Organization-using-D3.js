var margin = {top: 20, right: 120, bottom: 20, left: 240},
    width = 1200 - margin.right - margin.left,
    height = 1200 - margin.top - margin.bottom;

var i = 0,
    duration = 750,
    root,
    select2_data,
    oldPaths = [];

var diameter = 960;

var treemap = d3.tree()
    .size([height, width]);

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
      .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


// Creates a curved (diagonal) path from parent to the child nodes
function diagonal(s, d) {
    path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
            ${(s.y + d.y) / 2} ${d.x},
            ${d.y} ${d.x}`
    
    return path
}

// Toggle children on click.
function click(event,d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
      }
      else{
        d.children = d._children;
        d._children = null;
      }
    update(d);
}

//basically a way to get the path to an object
function searchTree(obj,search,path){
    if(obj.data.info.id === search){ //if search is found return, add the object to the path and return it
        path.push(obj);
        return path;
    }
    else if(obj.children || obj._children){ //if children are collapsed d3 object will have them instantiated as _children
        var children = (obj.children) ? obj.children : obj._children;
        for(var i=0;i<children.length;i++){
            path.push(obj);// we assume this path is the right one
            var found = searchTree(children[i],search,path);
            if(found){// we were right, this should return the bubbled-up path from the first if statement
                return found;
            }
            else{//we were wrong, remove this parent from the path and continue iterating
                path.pop();
            }
        }
    }
    else{//not the right object, return false so it will continue to iterate in the loop
        return false;
    }
}

function openPaths(paths, oldPaths){
    for(var i =0;i<oldPaths.length;i++){
        oldPaths[i].class = undefined;
    }

    // open every children node
    for(var i =0;i<paths.length;i++){
        if(paths[i].id !== "00"){//i.e. not root
            paths[i].class = 'found';
            update(paths[i]);
        }
    }
}



d3.csv("rawData.csv").then(function(fd){
    
    var data = fd;

    data.unshift({
        "id": "00",
        "official_name": "กรมในประเทศไทย",
        "alias_name": "",
        "total_leaf_node": ""
    });

    const findParent = (data, d) => {
        if (d.id === "00") return undefined;
        else {
            if(d.id.length == 2){
                index = 0;
            }
            else if(d.id.length == 5){
                index = data.findIndex(dta => dta.id === d.id.substring(0, 2));
            }
            else if(d.id.length == 8){
                index = data.findIndex(dta => dta.id === d.id.substring(0, 5));
            }

            return data[index].id;
        }
    }

    var initData = data.map((d) => ({
        "child": d.id,
        "parent": findParent(data, d),
        "info": d
    }))


    var dataStructure = d3.stratify()
                            .id((d) => d.child)
                            .parentId((d) => d.parent)
                            (initData);

    // Assigns parent, children, height, depth
    root = dataStructure;
    root.x0 = height / 2;
    root.y0 = 0;

    update(root);


    // Search box options
    var select2_data = [];
    
    const textSelect2 = (data, d) => {
        if(d.id.length == 2){
            text = d.id + "\t" + d.official_name
        }
        else if(d.id.length == 5){
            indexP2 = data.findIndex(dta => dta.id === d.id.substring(0, 2));
            text = d.id + " " + d.official_name + "     >>     " + data[indexP2].official_name
        }
        else if(d.id.length == 8){
            indexP1 = data.findIndex(dta => dta.id === d.id.substring(0, 5));
            indexP2 = data.findIndex(dta => dta.id === d.id.substring(0, 2));
            text = d.id + " " + d.official_name + "     >>     " + data[indexP1].official_name + "     >>     " + data[indexP2].official_name
        }
        
        return text;
    }

    for (var i = 1; i < data.length; i++) {
        select2_data.push({
            "id": data[i].id,
            "text": textSelect2(data, data[i])
        });
    }

    //init search box
    $("#search").select2({
        data: select2_data,
        containerCssClass: "search",
        width: 'resolve',
        dropdownAutoWidth: 'true',
        theme: "classic",
        placeholder: "พิมพ์เพื่อค้นหา",
        minimumInputLength: 3
    })

    //attach search box listener
    $("#search").on("select2-selecting", function(e) {
        var paths = searchTree(root,e.object.id,[]);
        if(typeof(paths) !== "undefined"){
            openPaths(paths, oldPaths);
            oldPaths = paths;
        }
        else{
            alert(e.object.text+" not found!");
        }
    })

    d3.select(self.frameElement).style("height", "800px");

    $("#reset").on('click', function() {
        $("#search").select2("val", "");
        openPaths([], oldPaths);
        oldPaths = [];
        update(root);
    });
});



function update(source) {

    // Assigns the x and y position for the nodes
    var treeData = treemap(root);

    // Compute the new tree layout.
    var nodes = treeData.descendants(),
    links = treeData.descendants().slice(1);

    // Normalize for fixed-depth.
    nodes.forEach(function(d){ d.y = d.depth * 250});
    // ****************** Nodes section ***************************

    // Update the nodes...
    var node = svg.selectAll('g.node')
    .data(nodes, function(d) {return d.id || (d.id = ++i); });

    // Enter any new modes at the parent's previous position.
    var nodeEnter = node.enter().append('g')
    .attr('class', 'node')
    .attr("transform", function(d) {
    return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    .on('click', click);

    // Add Circle for the nodes
    nodeEnter.append('circle')
    .on("mouseover", function(e,d){mouseover(e,d);})
    .on("mouseout", mouseout)
    .attr('class', 'node')
    .attr('r', 1e-6)
    .style("fill", function(d) {
        return d._children ? "lightsteelblue" : "#fff";
    });

    // Add labels for the nodes

    /*nodeEnter.append('text')
    .attr("dy", ".35em")
    .attr("x", function(d) {
        return d.children || d._children ? -13 : 13;
    })
    .attr("text-anchor", function(d) {
        return d.children || d._children ? "end" : "start";
    })
    .text(function(d) { 
    return "";
    });*/


    // UPDATE
    var nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the node
    nodeUpdate.transition()
    .duration(duration)
    .attr("transform", function(d) { 
    return "translate(" + d.y + "," + d.x + ")";
    });

    // Update the node attributes and style
    nodeUpdate.select('circle.node')
    .on("mouseover", function(e,d){mouseover(e,d);})
    .on("mouseout", mouseout)
    .attr('r', 7.5)
    .style("fill", function(d) {
                if(d.class === "found"){
                    return "#ff4136"; //red
                }
                else if(d._children){
                    return "lightsteelblue";
                }
                else{
                    return "#fff";
                }
            })
    .style("stroke", function(d) {
                if(d.class === "found"){
                    return "#ff4136"; //red
                }
        })
    .attr('cursor', 'pointer');


    // Remove any exiting nodes
    var nodeExit = node.exit().transition()
    .duration(duration)
    .attr("transform", function(d) {
        return "translate(" + source.y + "," + source.x + ")";
    })
    .remove();


    // On exit reduce the node circles size to 0
    nodeExit.select('circle')
    .attr('r', 1e-6);

    // On exit reduce the opacity of text labels
    /*nodeExit.select('text')
    .style('fill-opacity', 1e-6);*/

    // ****************** links section ***************************

    // Update the links...
    var link = svg.selectAll('path.link')
    .data(links, function(d) { return d.id; });

    // Enter any new links at the parent's previous position.
    var linkEnter = link.enter().insert('path', "g")
    .attr("class", "link")
    .attr('d', function(d){
    var o = {x: source.x0, y: source.y0}
    return diagonal(o, o)
    });

    // UPDATE
    var linkUpdate = linkEnter.merge(link);

    // Transition back to the parent element position
    linkUpdate.transition()
    .duration(duration)
    .attr('d', function(d){ return diagonal(d, d.parent) })
    .style("stroke",function(d){
                if(d.class==="found"){
                    return "#ff4136";
                }
            });

    // Remove any exiting links
    var linkExit = link.exit().transition()
    .duration(duration)
    .attr('d', function(d) {
    var o = {x: source.x, y: source.y}
    return diagonal(o, o)
    })
    .remove();

    // Store the old positions for transition.
    nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
    });

}

// On mouseover, add tooltip to the node
function mouseover(event,d) {

    if(d.data.info.id != "00"){
        var div = d3.select("body").append("div").attr("class", "container");
        var divID = div.append("div").attr("id", "ID");
        var divOffname = div.append("div").attr("id", "officialName");
        var divAlias = div.append("div").attr("id", "aliasName");
        var divLeaf = div.append("div").attr("id", "totalLeafNode");

        div.transition()
        .duration(300)
        .style("opacity", 1);

        div
        .style("left", (d.y+270) + "px")
        .style("top", (d.x+100) + "px");

        divID
        .text("ID: " + d.data.info.id);
        divOffname
        .text("Official Name: " + d.data.info.official_name);

        if(d.data.info.alias_name!=""){
            var displayText = "";
            for(var i=1; i<d.data.info.alias_name.length-1; i++){
                displayText += d.data.info.alias_name[i]; }
            divAlias
            .text("Alias Name: " + displayText);
        }
        else{
            divAlias.text("");
        }
        
        if(d.data.info.total_leaf_node!=0){
            divLeaf
            .text("Total Leaf Node: " + d.data.info.total_leaf_node);
        }
    }

}

// On mouseout, remove tooltip
function mouseout() {
    div = d3.select(".container");
    div.remove();
}