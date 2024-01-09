#pragma version 8

struct NftData:
    nft_id: int
    price: int
    owner: bytes[32]
end

struct BuyerData:
    claim0: int
    quantity: int
end
const int NORMAL_STATE = 0
if Txn.ApplicationID == 0:
    app_global_put("admin", Txn.Sender)
    app_global_put("owner", Txn.ApplicationArgs[0])
    app_global_put("contract_state", NORMAL_STATE)
    int gas_station_id = btoi(Txn.ApplicationArgs[1])

    inner_txn:
        TypeEnum: Appl
        ApplicationID: gas_station_id
        Fee: 0
        OnCompletion: NoOp
        ApplicationArgs[0]: method("withdraw()void")
    end

    exit(1)
end


switch Txn.OnCompletion:
    NoOp: main
    OptIn: opt_in
    CloseOut: close_out
    UpdateApplication: update_app
    DeleteApplication: delete_app
end


block main:
    switch Txn.ApplicationArgs[0]:
        "create_nft": create_nft
        "buy_nft": buy_nft
        "set_price": set_price
        "resell_nft": resell_nft
        else: fail
   end

    block create_nft:
        assert(Global.GroupSize == 2, "Maximum number of txns must be 2")
        assert(Gtxn[0].Receiver == Global.CurrentApplicationAddress, "Receiver must be the admin")
        assert(Gtxn[0].Amount == 1000000, "Must send 1 algo to the Contract address")
        assert(Txn.Sender == app_global_get("admin"))
        bytes asset_owner = Txn.ApplicationArgs[7]
        int total_issuance = 1
        int decimals = 0
        int is_fractional_nft = btoi(Txn.ApplicationArgs[6])
        if is_fractional_nft == 1:
            total_issuance = 1000
            decimals = 3
        end

        bytes asset_name = Txn.ApplicationArgs[1]
        bytes metadata_harsh = Txn.ApplicationArgs[2]
        bytes asset_url = Txn.ApplicationArgs[3]
        bytes unit_name = Txn.ApplicationArgs[4]
        bytes admin = app_global_get("admin")
        int price = btoi(Txn.ApplicationArgs[5])
        inner_txn:
            TypeEnum: Acfg
            Fee: 0
            ConfigAssetTotal: total_issuance
            ConfigAssetDecimals: decimals
            ConfigAssetUnitName: unit_name
            ConfigAssetName: asset_name
            ConfigAssetURL: asset_url
            ConfigAssetMetadataHash: admin
            ConfigAssetReserve: admin
            ConfigAssetFreeze: admin
            ConfigAssetClawback: admin
            ConfigAssetManager: Global.CurrentApplicationAddress
        end        

        int created_asset_id = gitxn(0, CreatedAssetID) 
        exit(1)
    end


    block set_price:
        int price = btoi(Txn.ApplicationArgs[1])
        int asset_id = btoi(Txn.ApplicationArgs[2])
        int asset_balance
        _, asset_balance = asset_holding_get(AssetBalance, Global.CurrentApplicationAddress, asset_id)
        assert(asset_balance >= 1, "The contract must hold the asset")
        int box_exists
        int box_length
        box_exists, box_length = box_len(itob(asset_id))
        if box_length == 0:
            box<NftData> nft_map = CreateBox(itob(asset_id))
            nft_map.price = price
            nft_map.nft_id = asset_id
            nft_map.owner = app_global_get("owner")
        else:
            assert(nft_map.owner == Txn.Sender)
            box<NftData> nft_map_ = OpenBox(itob(asset_id))
            nft_map_.price = price
            nft_map_.nft_id = asset_id
        end
        exit(1)
    end
  

    # arg 1 = buyer address, 2 = quantity to buy, 3 = asset_id    
    block buy_nft:
        bytes buyer = Txn.ApplicationArgs[1]
        int quantity = btoi(Txn.ApplicationArgs[2])
        int asset_id = btoi(Txn.ApplicationArgs[3])
        assert(Gtxn[0].Receiver == Global.CurrentApplicationAddress, "Receiver must be the app address")
        box<NftData> nft_map = OpenBox(itob(asset_id))
        assert(nft_map.price != 0, "The nft price cannot be zero")
        bytes box_key = concat(Txn.Sender, itob(asset_id))
        int box_exists
        int box_length
        box_exists, box_length = box_len(box_key)
        if box_length > 0:
            box<BuyerData> buyerData = OpenBox(box_key)
            buyerData.claim0 = 0
            buyerData.quantity = buyerData.quantity + quantity
        else:
            box<BuyerData> buyerData_ = CreateBox(box_key)
            buyerData_.claim0 = 0
            buyerData_.quantity = quantity
        end
        
        #send the payment to the contract
        int payment_amount = nft_map.price * quantity
        assert(Gtxn[0].Amount == (payment_amount + 10000), "Payment amount equal payment amount plus fees")
        inner_group:
            inner_txn:
                TypeEnum: Axfer
                AssetReceiver: buyer
                AssetAmount: quantity
                XferAsset: asset_id
                Fee: 0
            end
            inner_txn:
                TypeEnum: Pay
                Receiver: nft_map.owner
                Amount: payment_amount
                Fee: 0
            end
        end
        nft_map.owner = buyer
        nft_map.price = 0
        exit(1)
    end


    block resell_nft:
        assert(Gtxn[0].AssetAmount == 1, "AssetAmount must equal 1")
        int asset_id = Gtxn[0].XferAsset
        int box_exists
        int box_length
        box_exists, box_length = box_len(itob(asset_id))
        # remove if you want any kind of nft to be put up for sale
        assert(box_length > 0, "nft was not created by artist")
        int price = btoi(Txn.ApplicationArgs[1])
        assert(price > 0, "selling price must be greater than zero")
        box<NftData> nft_map = OpenBox(itob(asset_id))
        nft_map.owner = Txn.Sender
        assert(Global.GroupSize == 2, "Maximum number of txns must be 2")
        assert(Gtxn[0].AssetReceiver == Global.CurrentApplicationAddress, "the receiver must be the current application address")
        assert(Gtxn[0].AssetSender != Global.CurrentApplicationAddress, "the sender must not be the app address")
        exit(1)
    end


    block fail:
    exit(0)
   end
end


block opt_in:
    exit(1)
end

block close_out:
    exit(1)
end

block update_app:
    if Txn.Sender == app_global_get("admin"):
        exit(1)
    end

    exit(0)
end


block delete_app:
    if Txn.Sender == app_global_get("admin"):
        exit(1)
    end

    exit(0)
end







#store the artist that created the nft in the metadata.json* really important for purchasing NFT


#each Artist calls create_nft
#    if user has artist_app, call create_nft in his artist_app
#    if not, create a artist_app for that user and call create_nft in that app


#listing an nft
#reading a users box, reading his user_app and then all the assets created by him